"""
main.py — FastAPI entry point for the Composition Agent.
Orchestrates the full composition pipeline via the /compose endpoint.
"""

import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from compressor import (
    assign_compression_levels,
    get_next_compression_level,
    get_token_count_for_level,
    FULL,
    COMPRESSED,
    CONSTRAINT_ONLY,
    OMIT,
)
from block_assembler import assign_blocks, BLOCK_LABELS
from budget_fitter import enforce_budget
from context_builder import build_context_string
from importance_scorer import score_nodes
from token_counter import count_tokens, estimate_node_tokens

app = FastAPI(
    title="Composition Agent API",
    description="BRAHMO Composition Agent — token-efficient, priority-ordered context injection.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "sample_nodes.json")

# ── User + Patient Profiles ─────────────────────────────────────────────────────
USERS = {
    "U-VIKRAM": {"id": "U-VIKRAM", "name": "Dr. Vikram (HOD Ortho)", "role": "HOD", "department": "ortho", "ceiling_level": 4},
    "U-PRIYA":  {"id": "U-PRIYA",  "name": "Nurse Priya",            "role": "VIEWER", "department": "ortho", "ceiling_level": 10},
}

PATIENTS = {
    "PAT-RAJAN": {"id": "PAT-RAJAN", "name": "Mr. Rajan",  "age": 68, "gender": "M", "conditions": ["Cardiac stent", "AF on Warfarin", "Knee pain OA"]},
    "PAT-PADMA": {"id": "PAT-PADMA", "name": "Mrs. Padma", "age": 62, "gender": "F", "conditions": ["Type 2 DM", "Hypertension", "Fasting observance"]},
}

SYSTEM_PROMPT_TEMPLATE = """You are BRAHMO, an organizationally-aware AI assistant for Supra Multi-Specialty Hospital.
You have been provided with structured context assembled specifically for this session by the Composition Agent.
This context was pre-filtered by the Rules Engine from 842 organizational knowledge nodes down to 28 candidates,
then further structured, scored, and token-budget-enforced before being injected here.

ABOUT THIS CONTEXT:
- The context below is organized into 8 structured blocks in fixed priority order.
- Block 2 (Global Constraints) and Block 4 (Active Constraints) contain non-negotiable safety rules.
- Block 3 (Recent Decisions) reflects the latest clinical and operational decisions for this department.
- Block 5 (Session Context) contains patient-specific facts, anti-patterns, and supporting information.
- Block 7 (Stale Flags), if present, lists knowledge nodes flagged for human review — treat with caution.
- Block 8 (Session Boundaries) explains how to capture new knowledge at the end of the session.

OPERATIONAL RULES:
1. Always apply the organizational context to every response you give in this session.
2. CONSTRAINT nodes are non-negotiable. Never recommend, suggest, or imply any action that violates a CONSTRAINT.
   If a user requests something that conflicts with a CONSTRAINT, politely explain the constraint and why it exists.
3. DECISION nodes reflect deliberate organizational choices. Reference them explicitly when relevant.
   Use language like: "Per Supra's post-TKR protocol decided by Dr. Vikram..."
4. ANTI_PATTERN nodes document past incidents and known failure modes. Proactively warn when a situation
   resembles a documented anti-pattern, even if the user doesn't ask.
5. FACT nodes provide background context. Use them to enrich your responses, but they are not safety-critical.
6. If you don't have sufficient context to answer confidently, say: "I don't have enough context for that —
   please consult the relevant specialist or check the latest organizational policy."
7. STALE nodes (Block 7) are flagged for review. If a stale node is relevant to the user's query,
   note that the information may be outdated and recommend verification.
8. At the end of each response, if the user has shared any new clinical decisions, constraints, or protocols
   worth preserving in the knowledge graph, append them with this exact prefix:
   CAPTURE: [description of what was captured]
   This allows the session output to be reviewed for knowledge graph storage.

CURRENT SESSION:
User: {user_name} ({user_role})
Organization: Supra Multi-Specialty Hospital
Context assembled by: BRAHMO Composition Agent v1.0
Token budget: {token_budget} tokens | System: {system_tokens} | Context: {context_tokens} | User reserve: {user_reserve}
"""


class ComposeRequest(BaseModel):
    data_file: Optional[str] = None
    budget: Optional[int] = 4000
    user_id: Optional[str] = "U-VIKRAM"
    patient_id: Optional[str] = "PAT-RAJAN"


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "BRAHMO Composition Agent", "version": "1.0.0"}


@app.get("/users", tags=["Meta"])
def get_users():
    return list(USERS.values())


@app.get("/patients", tags=["Meta"])
def get_patients():
    return list(PATIENTS.values())


def _build_system_prompt(user: dict, budget: int, context_tokens: int, user_reserve: int) -> str:
    """Render the system prompt and converge its self-reported token count."""
    system_tokens = 0
    prompt = ""
    for _ in range(4):
        prompt = SYSTEM_PROMPT_TEMPLATE.format(
            user_name=user["name"],
            user_role=user["role"],
            token_budget=budget,
            system_tokens=system_tokens,
            context_tokens=context_tokens,
            user_reserve=user_reserve,
        )
        actual = count_tokens(prompt)
        if actual == system_tokens:
            return prompt
        system_tokens = actual
    return prompt


def _ensure_token_fields(node: dict) -> None:
    required = ("tokens_full", "tokens_compressed", "tokens_constraint_only")
    if all(key in node for key in required):
        return
    node.update(estimate_node_tokens(node))


def _estimated_context_tokens(nodes: list[dict]) -> int:
    total = 0
    for node in nodes:
        total += get_token_count_for_level(node, node.get("compression_level", FULL))
    return total


def _actual_totals(context_string: str, user: dict, budget: int, user_reserve_tokens: int) -> tuple[str, int, int, int]:
    context_tokens = count_tokens(context_string)
    system_prompt = _build_system_prompt(
        user=user,
        budget=budget,
        context_tokens=context_tokens,
        user_reserve=user_reserve_tokens,
    )
    system_prompt_tokens = count_tokens(system_prompt)
    total_tokens = system_prompt_tokens + context_tokens + user_reserve_tokens
    return system_prompt, system_prompt_tokens, context_tokens, total_tokens


def _find_rendered_compression_target(nodes: list[dict]) -> Optional[dict]:
    candidates = [
        node for node in nodes
        if node.get("type") not in ("CONSTRAINT", "STATIC")
        and node.get("compression_level") != OMIT
    ]
    if not candidates:
        return None
    candidates.sort(
        key=lambda n: (
            float(n.get("injection_weight", 1.0)),
            -int(n.get("distance", 0)),
        )
    )
    return candidates[0]


def _fit_rendered_context(
    nodes: list[dict],
    user: dict,
    patient: dict,
    budget: int,
    user_reserve_tokens: int,
    compression_log: list[dict],
) -> tuple[list[dict], dict, str, str, int, int, int]:
    nodes = [dict(node) for node in nodes]

    while True:
        blocks = assign_blocks(nodes)
        context_string = build_context_string(blocks, user=user, patient=patient)
        system_prompt, system_prompt_tokens, context_tokens, total_tokens = _actual_totals(
            context_string=context_string,
            user=user,
            budget=budget,
            user_reserve_tokens=user_reserve_tokens,
        )

        if total_tokens <= budget:
            return nodes, blocks, context_string, system_prompt, system_prompt_tokens, context_tokens, total_tokens

        target = _find_rendered_compression_target(nodes)
        if target is None:
            return nodes, blocks, context_string, system_prompt, system_prompt_tokens, context_tokens, total_tokens

        current_level = target.get("compression_level", FULL)
        next_level = get_next_compression_level(current_level)
        if next_level is None:
            return nodes, blocks, context_string, system_prompt, system_prompt_tokens, context_tokens, total_tokens

        before_total = total_tokens
        target["compression_level"] = next_level

        next_blocks = assign_blocks(nodes)
        next_context = build_context_string(next_blocks, user=user, patient=patient)
        _, _, next_context_tokens, next_total = _actual_totals(
            context_string=next_context,
            user=user,
            budget=budget,
            user_reserve_tokens=user_reserve_tokens,
        )

        compression_log.append({
            "pass": len(compression_log),
            "action": "rendered_compress",
            "total_tokens": next_total,
            "context_tokens": next_context_tokens,
            "over_budget": next_total > budget,
            "node_id": target["id"],
            "node_title": target.get("title", ""),
            "node_type": target.get("type", ""),
            "from_level": current_level,
            "to_level": next_level,
            "tokens_saved": max(before_total - next_total, 0),
            "injection_weight": target.get("injection_weight", 0),
            "distance": target.get("distance", 0),
        })


def _token_count_for_node(node: dict) -> int:
    return get_token_count_for_level(node, node.get("compression_level", FULL))


def _decision_trace(node: dict, initial: str, final: str) -> list[str]:
    if node.get("type") == "CONSTRAINT":
        return [
            "type=CONSTRAINT -> protected",
            "constraint protection -> forced FULL",
            "budget pressure cannot compress this node",
        ]

    distance = int(node.get("distance", 0))
    if distance <= 1:
        distance_rule = "distance 0-1 -> default FULL"
    elif distance == 2:
        distance_rule = "distance 2 -> default COMPRESSED"
    else:
        distance_rule = "distance 3+ -> default CONSTRAINT_ONLY"

    trace = [
        distance_rule,
        f"injection_weight={float(node.get('injection_weight', 0)):.2f} controls budget priority",
    ]
    if initial != final:
        trace.append(f"budget pressure changed {initial} -> {final}")
    else:
        trace.append(f"final level remained {final}")
    return trace


def _compose_response(
    user: dict,
    patient: dict,
    budget: int,
    user_reserve_tokens: int,
    context_budget: int,
    system_prompt_tokens: int,
    context_tokens: int,
    total_tokens: int,
    context_string: str,
    fitted_nodes: list[dict],
    fitted_blocks: dict,
    compression_log: list[dict],
    initial_levels: dict,
) -> dict:
    token_stats = {
        "system_prompt_tokens": system_prompt_tokens,
        "context_tokens": context_tokens,
        "actual_context_tokens": context_tokens,
        "estimated_context_tokens": _estimated_context_tokens(fitted_nodes),
        "user_reserve_tokens": user_reserve_tokens,
        "total": total_tokens,
        "budget": budget,
        "remaining": budget - total_tokens,
        "over_budget": total_tokens > budget,
        "context_budget": context_budget,
    }

    block_breakdown = {}
    for block_num, block_nodes in fitted_blocks.items():
        block_breakdown[block_num] = {
            "label": BLOCK_LABELS.get(block_num, f"Block {block_num}"),
            "node_count": len(block_nodes),
            "tokens": sum(_token_count_for_node(n) for n in block_nodes),
        }

    node_block_map = {}
    for bnum, bnodes in fitted_blocks.items():
        for n in bnodes:
            node_block_map[n["id"]] = bnum

    node_details = []
    for n in fitted_nodes:
        nid = n["id"]
        lvl = n.get("compression_level", FULL)
        initial = initial_levels.get(nid, FULL)
        node_details.append({
            "id": nid,
            "title": n.get("title", ""),
            "type": n.get("type", ""),
            "zone": n.get("zone"),
            "status": n.get("status"),
            "retrieval_weight": n.get("retrieval_weight", n.get("injection_weight", 0)),
            "injection_weight": n.get("injection_weight", 0),
            "importance_score": n.get("importance_score", 0),
            "distance": n.get("distance", 0),
            "initial_compression": initial,
            "final_compression": lvl,
            "was_compressed": initial != lvl,
            "block": node_block_map.get(nid),
            "block_label": BLOCK_LABELS.get(node_block_map.get(nid), ""),
            "tokens_used": _token_count_for_node(n),
            "tokens_full": n.get("tokens_full", 0),
            "tokens_compressed": n.get("tokens_compressed", 0),
            "tokens_constraint_only": n.get("tokens_constraint_only", 0),
            "is_constraint_protected": n.get("type") == "CONSTRAINT",
            "include_reason": _include_reason(n, lvl),
            "decision_trace": _decision_trace(n, initial, lvl),
            "content_used": _get_content(n, lvl),
        })

    included = [n for n in fitted_nodes if n.get("compression_level") != OMIT and n.get("type") != "STATIC"]
    omitted = [n for n in fitted_nodes if n.get("compression_level") == OMIT]
    constraints_protected = sum(1 for n in fitted_nodes if n.get("type") == "CONSTRAINT")

    compression_summary = {}
    for n in fitted_nodes:
        lvl = n.get("compression_level", FULL)
        compression_summary[lvl] = compression_summary.get(lvl, 0) + 1

    iterations = len([entry for entry in compression_log if entry.get("action") != "initial"])

    return {
        "user": user,
        "patient": patient,
        "context_string": context_string,
        "token_stats": token_stats,
        "block_breakdown": block_breakdown,
        "node_details": node_details,
        "compression_summary": compression_summary,
        "compression_log": compression_log,
        "iterations": iterations,
        "total_nodes": len([n for n in fitted_nodes if n.get("type") != "STATIC"]),
        "nodes_included": len(included),
        "nodes_omitted": len(omitted),
        "constraints_protected": constraints_protected,
        "budget_warning": None,
        "safety_status": "COMPRESSED_TO_FIT" if iterations else "FIT",
    }


@app.post("/compose", tags=["Composition"])
def compose_strict(request: ComposeRequest = ComposeRequest()):
    user = USERS.get(request.user_id or "U-VIKRAM", USERS["U-VIKRAM"])
    patient = PATIENTS.get(request.patient_id or "PAT-RAJAN", PATIENTS["PAT-RAJAN"])
    budget = request.budget or 4000
    user_reserve_tokens = 200

    if budget <= 0:
        raise HTTPException(status_code=422, detail="Budget must be a positive integer.")

    file_path = request.data_file or DATA_FILE
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Data file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        nodes = json.load(f)

    for node in nodes:
        _ensure_token_fields(node)

    nodes = score_nodes(assign_compression_levels(nodes))
    initial_levels = {n["id"]: n.get("compression_level", FULL) for n in nodes}

    bootstrap_prompt = _build_system_prompt(
        user=user,
        budget=budget,
        context_tokens=0,
        user_reserve=user_reserve_tokens,
    )
    bootstrap_system_tokens = count_tokens(bootstrap_prompt)
    context_budget = budget - bootstrap_system_tokens - user_reserve_tokens

    blocks = assign_blocks(nodes)
    flat_nodes = [node for block_nodes in blocks.values() for node in block_nodes]
    budget_result = enforce_budget(
        flat_nodes,
        budget=budget,
        system_tokens=bootstrap_system_tokens,
        user_tokens=user_reserve_tokens,
    )

    compression_log = budget_result.get("compression_log", [])
    (
        fitted_nodes,
        fitted_blocks,
        context_string,
        _system_prompt,
        system_prompt_tokens,
        context_tokens,
        total_tokens,
    ) = _fit_rendered_context(
        nodes=budget_result["nodes"],
        user=user,
        patient=patient,
        budget=budget,
        user_reserve_tokens=user_reserve_tokens,
        compression_log=compression_log,
    )

    if total_tokens > budget:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Budget cannot be met safely. Final total={total_tokens}, "
                f"Budget={budget}. All non-CONSTRAINT nodes are omitted; "
                "increase budget or reduce protected CONSTRAINT set."
            ),
        )

    return _compose_response(
        user=user,
        patient=patient,
        budget=budget,
        user_reserve_tokens=user_reserve_tokens,
        context_budget=context_budget,
        system_prompt_tokens=system_prompt_tokens,
        context_tokens=context_tokens,
        total_tokens=total_tokens,
        context_string=context_string,
        fitted_nodes=fitted_nodes,
        fitted_blocks=fitted_blocks,
        compression_log=compression_log,
        initial_levels=initial_levels,
    )



def _include_reason(node: dict, level: str) -> str:
    ntype = node.get("type", "")
    dist  = node.get("distance", 0)
    inj   = node.get("injection_weight", 0)
    if ntype == "CONSTRAINT":
        return "CONSTRAINT — never compressed, always included at FULL"
    if level == OMIT:
        return f"Omitted: low injection weight ({inj:.2f}) + budget pressure"
    if level == CONSTRAINT_ONLY:
        return f"Constraint-only: distance {dist} + low injection weight ({inj:.2f})"
    if level == COMPRESSED:
        return f"Compressed: distance {dist} exceeded FULL threshold"
    return f"Included at FULL: distance {dist}, injection weight {inj:.2f}"


def _get_content(node: dict, level: str) -> str:
    if level == FULL:             return node.get("content_full", "")
    if level == COMPRESSED:       return node.get("content_compressed", "")
    if level == CONSTRAINT_ONLY:  return node.get("content_constraint_only", "")
    return ""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
