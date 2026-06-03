"""
compressor.py — Assigns initial compression levels to nodes based on type and distance.
Compression levels control which content variant is used in the final context.
"""

from typing import List, Optional

# ── Compression Level Constants ───────────────────────────────────────────────
FULL = "FULL"
COMPRESSED = "COMPRESSED"
CONSTRAINT_ONLY = "CONSTRAINT_ONLY"
OMIT = "OMIT"

# ── Distance Thresholds ────────────────────────────────────────────────────────
DISTANCE_FULL_MAX = 1        # distance 0–1  → FULL
DISTANCE_COMPRESSED_MAX = 2  # distance 2    → COMPRESSED
# distance >= 3              → CONSTRAINT_ONLY

# ── Compression Degradation Order ─────────────────────────────────────────────
# Used by budget_fitter.py to step down one level at a time.
COMPRESSION_ORDER = [FULL, COMPRESSED, CONSTRAINT_ONLY, OMIT]


def assign_compression_level(node: dict) -> str:
    """
    Determine the appropriate compression level for a single node.

    Rules:
        - CONSTRAINT nodes → always FULL (never compress)
        - All others:
            distance 0–1  → FULL
            distance == 2 → COMPRESSED
            distance >= 3 → CONSTRAINT_ONLY

    Args:
        node: A node dict with 'type' and 'distance' fields.

    Returns:
        One of: "FULL", "COMPRESSED", "CONSTRAINT_ONLY", "OMIT"
    """
    node_type = node.get("type", "FACT")
    distance = int(node.get("distance", 0))

    # CONSTRAINT nodes are always injected at full fidelity
    if node_type == "CONSTRAINT":
        return FULL

    # Distance-based compression for all other types
    if distance <= DISTANCE_FULL_MAX:
        return FULL
    elif distance <= DISTANCE_COMPRESSED_MAX:
        return COMPRESSED
    else:
        return CONSTRAINT_ONLY


def assign_compression_levels(nodes: List[dict]) -> List[dict]:
    """
    Assign compression levels to all nodes in the list.

    Mutates each node in-place by adding a 'compression_level' field,
    and also returns the list for chaining convenience.

    Args:
        nodes: List of node dicts.

    Returns:
        Same list with 'compression_level' set on each node.
    """
    for node in nodes:
        node["compression_level"] = assign_compression_level(node)
    return nodes


def get_next_compression_level(current_level: str) -> Optional[str]:
    """
    Get the next (more aggressive) compression level in the degradation chain.

    Chain: FULL → COMPRESSED → CONSTRAINT_ONLY → OMIT → None

    Args:
        current_level: Current compression level string.

    Returns:
        Next level string, or None if already at OMIT.
    """
    try:
        idx = COMPRESSION_ORDER.index(current_level)
        if idx + 1 < len(COMPRESSION_ORDER):
            return COMPRESSION_ORDER[idx + 1]
        return None  # Already at OMIT
    except ValueError:
        return None


def get_token_count_for_level(node: dict, level: str) -> int:
    """
    Return the token count for a node at a given compression level.

    Args:
        node:  Node dict with tokens_full, tokens_compressed, tokens_constraint_only.
        level: Target compression level.

    Returns:
        Integer token count.
    """
    mapping = {
        FULL: "tokens_full",
        COMPRESSED: "tokens_compressed",
        CONSTRAINT_ONLY: "tokens_constraint_only",
        OMIT: None,
    }
    key = mapping.get(level)
    if key is None:
        return 0
    return int(node.get(key, 0))
