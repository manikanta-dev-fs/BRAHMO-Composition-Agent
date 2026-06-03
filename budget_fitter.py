"""
budget_fitter.py — Iterative compression engine to enforce the token budget.
The most critical module: progressively degrades low-priority nodes until
total tokens fit within the defined budget.
"""

from typing import List, Optional
from compressor import (
    FULL, COMPRESSED, CONSTRAINT_ONLY, OMIT,
    get_next_compression_level,
    get_token_count_for_level,
)

DEFAULT_SYSTEM_TOKENS = 800
DEFAULT_USER_TOKENS   = 200


def _calc_context_tokens(nodes: List[dict]) -> int:
    total = 0
    for node in nodes:
        level = node.get("compression_level", FULL)
        total += get_token_count_for_level(node, level)
    return total


def _find_lowest_priority_compressible(nodes: List[dict]) -> Optional[dict]:
    """Find the non-CONSTRAINT node with lowest injection_weight that can still be compressed."""
    candidates = [
        n for n in nodes
        if n.get("type") not in ("CONSTRAINT", "STATIC")
        and n.get("compression_level") != OMIT
    ]
    if not candidates:
        return None
    # Sort by injection_weight ASC, then distance DESC (farther = compress first)
    candidates.sort(
        key=lambda n: (float(n.get("injection_weight", 1.0)), -int(n.get("distance", 0)))
    )
    return candidates[0]


def enforce_budget(
    nodes: List[dict],
    budget: int = 4000,
    system_tokens: int = DEFAULT_SYSTEM_TOKENS,
    user_tokens: int = DEFAULT_USER_TOKENS,
) -> dict:
    """
    Iteratively compress nodes until total tokens (system + context + user) <= budget.

    Rules:
    - Total = system_tokens + context_tokens + user_tokens
    - Loop: find lowest injection_weight non-CONSTRAINT node, step it down
      FULL -> COMPRESSED -> CONSTRAINT_ONLY -> OMIT
    - CONSTRAINT nodes are NEVER compressed
    - Returns error message if budget cannot be met after exhausting all non-CONSTRAINTs
    """
    nodes = [dict(n) for n in nodes]  # deep copy so originals are untouched
    iterations = 0
    compression_log = []

    overhead = system_tokens + user_tokens
    context_tokens = _calc_context_tokens(nodes)
    total = overhead + context_tokens

    # Log initial state
    compression_log.append({
        "pass": 0,
        "action": "initial",
        "total_tokens": total,
        "context_tokens": context_tokens,
        "over_budget": total > budget,
        "node_id": None,
        "node_title": None,
        "from_level": None,
        "to_level": None,
        "tokens_saved": 0,
    })

    while total > budget:
        target = _find_lowest_priority_compressible(nodes)

        if target is None:
            return {
                "nodes": nodes,
                "total_tokens": total,
                "context_tokens": context_tokens,
                "iterations": iterations,
                "compression_log": compression_log,
                "error": (
                    f"Budget cannot be met. Total={total}, Budget={budget}. "
                    "All non-CONSTRAINT nodes are OMITTED. Increase budget or reduce CONSTRAINT set."
                ),
            }

        current_level = target.get("compression_level", FULL)
        next_level    = get_next_compression_level(current_level)
        if next_level is None:
            # Already at OMIT — should not happen since we filter OMIT above
            break

        tokens_before = get_token_count_for_level(target, current_level)
        tokens_after  = get_token_count_for_level(target, next_level)
        saved         = tokens_before - tokens_after

        target["compression_level"] = next_level
        iterations += 1

        context_tokens = _calc_context_tokens(nodes)
        total = overhead + context_tokens

        compression_log.append({
            "pass": iterations,
            "action": "compress",
            "total_tokens": total,
            "context_tokens": context_tokens,
            "over_budget": total > budget,
            "node_id": target["id"],
            "node_title": target.get("title", ""),
            "node_type": target.get("type", ""),
            "from_level": current_level,
            "to_level": next_level,
            "tokens_saved": saved,
            "injection_weight": target.get("injection_weight", 0),
            "distance": target.get("distance", 0),
        })

    return {
        "nodes": nodes,
        "total_tokens": total,
        "context_tokens": context_tokens,
        "iterations": iterations,
        "compression_log": compression_log,
        "error": None,
    }


