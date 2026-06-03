"""
block_assembler.py — Assigns candidate nodes into 8 structured context blocks.
Each block has a fixed semantic role in the final composed prompt.
"""

from typing import List


# ── Block Label Map ───────────────────────────────────────────────────────────
BLOCK_LABELS = {
    1: "ROLE",
    2: "GLOBAL CONSTRAINTS",
    3: "DECISIONS",
    4: "ACTIVE CONSTRAINTS",
    5: "SESSION CONTEXT",
    6: "OPEN QUESTIONS",
    7: "STALE FLAGS",
    8: "BOUNDARIES",
}

# ── Static Block Content ──────────────────────────────────────────────────────
ROLE_TEXT = (
    "You are Brahmo, an expert clinical decision support agent. "
    "Your role is to assist medical teams with context-aware, protocol-compliant recommendations. "
    "Always prioritize patient safety above all else."
)

BOUNDARIES_TEXT = (
    "Do not generate diagnoses without sufficient clinical data. "
    "Do not recommend off-label treatments unless explicitly flagged. "
    "All suggestions must comply with the active institutional constraints listed above."
)


def assign_blocks(nodes: List[dict]) -> dict:
    """
    Assign a list of candidate nodes to one of 8 structured context blocks.

    Block Rules:
        1  – ROLE:               Static text (no nodes needed)
        2  – GLOBAL CONSTRAINTS: type == CONSTRAINT  AND  zone == 2
        3  – DECISIONS:          type == DECISION
        4  – ACTIVE CONSTRAINTS: type == CONSTRAINT  AND  zone == 1  (or zone unset)
        5  – SESSION CONTEXT:    type in {FACT, ANTI_PATTERN} + any remaining nodes
        6  – OPEN QUESTIONS:     Always empty (reserved for future use)
        7  – STALE FLAGS:        status == REVIEW_REQUIRED
        8  – BOUNDARIES:         Static text (no nodes needed)

    Args:
        nodes: List of node dicts.

    Returns:
        dict mapping block_number (int) → list of nodes.
        Static blocks (1, 8) contain a single synthetic text node.
        Block 6 is always an empty list.
    """
    nodes = [node for node in nodes if node.get("type") != "STATIC"]
    blocks: dict[int, list] = {i: [] for i in range(1, 9)}

    # ── Static Blocks ──────────────────────────────────────────────────────
    blocks[1] = [_static_node(1, "ROLE", ROLE_TEXT)]
    blocks[8] = [_static_node(8, "BOUNDARIES", BOUNDARIES_TEXT)]
    blocks[6] = []  # Reserved / always empty

    # ── Track assigned nodes to avoid duplication ──────────────────────────
    assigned_ids: set = set()

    # ── Block 7: Stale Flags ───────────────────────────────────────────────
    for node in nodes:
        if node.get("status") == "REVIEW_REQUIRED":
            blocks[7].append(node)
            assigned_ids.add(node["id"])

    # ── Block 2: Global Constraints (zone=2) ───────────────────────────────
    for node in nodes:
        if node["id"] in assigned_ids:
            continue
        if node.get("type") == "CONSTRAINT" and node.get("zone") == 2:
            blocks[2].append(node)
            assigned_ids.add(node["id"])

    # ── Block 3: Decisions ─────────────────────────────────────────────────
    for node in nodes:
        if node["id"] in assigned_ids:
            continue
        if node.get("type") == "DECISION":
            blocks[3].append(node)
            assigned_ids.add(node["id"])

    # ── Block 4: Active Constraints (zone=1 or unset zone) ────────────────
    for node in nodes:
        if node["id"] in assigned_ids:
            continue
        if node.get("type") == "CONSTRAINT":
            blocks[4].append(node)
            assigned_ids.add(node["id"])

    # ── Block 5: Session Context (FACT, ANTI_PATTERN, others) ─────────────
    for node in nodes:
        if node["id"] in assigned_ids:
            continue
        if node.get("type") in ("FACT", "ANTI_PATTERN"):
            blocks[5].append(node)
            assigned_ids.add(node["id"])

    # ── Remaining unclassified nodes → Block 5 ────────────────────────────
    for node in nodes:
        if node["id"] not in assigned_ids:
            blocks[5].append(node)
            assigned_ids.add(node["id"])

    return blocks


def _static_node(block_id: int, label: str, text: str) -> dict:
    """
    Create a synthetic static node for blocks that contain fixed text.

    Args:
        block_id: The block number this node belongs to.
        label:    Human-readable label.
        text:     The static content string.

    Returns:
        A minimal node dict with static content in all compression variants.
    """
    return {
        "id": f"static_block_{block_id}",
        "type": "STATIC",
        "title": label,
        "content_full": text,
        "content_compressed": text,
        "content_constraint_only": text,
        "compression_level": "FULL",
        "injection_weight": 1.0,
        "distance": 0,
        "zone": None,
        "status": None,
        "tokens_full": len(text.split()),      # Approximate; not tiktoken for static
        "tokens_compressed": len(text.split()),
        "tokens_constraint_only": len(text.split()),
    }
