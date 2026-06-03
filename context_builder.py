"""
context_builder.py — Assembles the final context string from 8 structured blocks.
Respects compression levels: skips OMIT nodes, selects correct content variant.
"""

from typing import Dict, List, Optional

BLOCK_HEADERS = {
    1: "ROLE",
    2: "GLOBAL CONSTRAINTS",
    3: "RECENT DECISIONS",
    4: "ACTIVE CONSTRAINTS",
    5: "SESSION CONTEXT",
    6: "OPEN QUESTIONS",
    7: "STALE FLAGS",
    8: "SESSION BOUNDARIES",
}


def build_context_string(
    blocks: Dict[int, List[dict]],
    user: Optional[dict] = None,
    patient: Optional[dict] = None,
) -> str:
    """
    Assemble the final context string from all 8 blocks.

    Rules:
    - Blocks always appear in order 1-8
    - OMIT nodes are skipped entirely
    - Block 6 is always empty (placeholder for v0.2)
    - Block 7 (Stale Flags) is omitted entirely if no REVIEW_REQUIRED nodes exist
    - Block 1 (Role) uses dynamic user+patient info if provided
    - Block 8 always ends with CAPTURE: instruction
    """
    sections: List[str] = []

    for block_num in range(1, 9):
        block_nodes = blocks.get(block_num, [])

        # Block 6 — always empty
        if block_num == 6:
            sections.append(f"=== {BLOCK_HEADERS.get(block_num, 'OPEN QUESTIONS')} ===")
            sections.append("None.")
            continue

        # Block 7 — omit entirely if no stale nodes
        if block_num == 7:
            real_stale = [
                n for n in block_nodes
                if n.get("status") == "REVIEW_REQUIRED"
            ]
            if not real_stale:
                continue

        header = f"=== {BLOCK_HEADERS.get(block_num, f'BLOCK {block_num}')} ==="

        # Block 1: Dynamic role frame
        if block_num == 1:
            role_lines = _build_role_block(user, patient)
            sections.append(header)
            sections.extend(role_lines)
            continue

        # Block 8: Static CAPTURE instruction
        if block_num == 8:
            sections.append(header)
            sections.append(
                "At the end of this session, if the user shared any new decisions, "
                "protocols, or constraints, note them prefixed with:\n"
                "CAPTURE: [what was captured]\n"
                "So they can be reviewed for knowledge graph storage."
            )
            continue

        # Dynamic blocks: pick content based on compression level
        block_lines: List[str] = []
        for node in block_nodes:
            node_type   = node.get("type", "")
            compression = node.get("compression_level", "FULL")

            if compression == "OMIT":
                continue

            # Select content variant
            if compression == "FULL" or node_type == "STATIC":
                content = node.get("content_full", "")
            elif compression == "COMPRESSED":
                content = node.get("content_compressed", "")
            elif compression == "CONSTRAINT_ONLY":
                content = node.get("content_constraint_only", "")
            else:
                content = node.get("content_full", "")

            if not content:
                continue

            title = node.get("title", "")
            if title and node_type != "STATIC":
                block_lines.append(f"[{title}]")

            block_lines.append(content)

            # Add compression annotation for non-FULL nodes (ASCII-safe)
            if compression not in ("FULL", "OMIT") and node_type != "STATIC":
                block_lines.append(f"  >> [{compression}]")

        if block_lines:
            sections.append(header)
            sections.extend(block_lines)

    return "\n\n".join(sections)


def _build_role_block(user: Optional[dict], patient: Optional[dict]) -> List[str]:
    """Generate the dynamic role frame for Block 1."""
    lines = []

    if user:
        lines.append(
            f"You are assisting {user['name']}, {user.get('role', 'clinician')} "
            f"in the {user.get('department', 'hospital').capitalize()} department "
            f"at Supra Multi-Specialty Hospital."
        )
    else:
        lines.append("You are assisting a clinician at Supra Multi-Specialty Hospital.")

    if patient:
        conditions = patient.get("conditions", [])
        conditions_str = ", ".join(conditions) if conditions else "N/A"
        lines.append(
            f"Current patient: {patient['name']}, "
            f"{patient.get('age', '?')}{patient.get('gender', '')}. "
            f"Active conditions: {conditions_str}."
        )

    lines.append(
        "Apply all constraints and protocols from the context below. "
        "Prioritize patient safety. Reference organizational policies explicitly."
    )
    return lines
