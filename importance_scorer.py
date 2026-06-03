"""
importance_scorer.py — Computes and normalizes importance scores for nodes.
Used to rank nodes for compression priority during budget enforcement.
"""

from typing import List


# ── Type Weight Map ───────────────────────────────────────────────────────────
# Base weight multiplier assigned per node type.
TYPE_WEIGHT: dict[str, float] = {
    "CONSTRAINT":   1.0,   # Always highest priority — never compressed
    "DECISION":     0.85,  # High priority; recent decisions matter most
    "FACT":         0.65,  # Moderate; session-level facts
    "ANTI_PATTERN": 0.50,  # Lower; useful but compressible
}

# ── Distance Decay ────────────────────────────────────────────────────────────
# Score penalty per distance unit from the current turn.
DISTANCE_DECAY = 0.1


def compute_importance_score(node: dict) -> float:
    """
    Compute a normalized importance score [0.0, 1.0] for a single node.

    Formula:
        score = type_weight * injection_weight * distance_factor
        score = clamp(score, 0.0, 1.0)

    where:
        distance_factor = max(0.0, 1.0 - distance * DISTANCE_DECAY)

    Args:
        node: A node dict with fields: type, injection_weight, distance.

    Returns:
        Float score between 0.0 and 1.0.
    """
    node_type = node.get("type", "FACT")
    injection_weight = float(node.get("injection_weight", 0.5))
    distance = int(node.get("distance", 0))

    type_weight = TYPE_WEIGHT.get(node_type, 0.5)
    distance_factor = max(0.0, 1.0 - distance * DISTANCE_DECAY)

    raw_score = type_weight * injection_weight * distance_factor
    return round(min(max(raw_score, 0.0), 1.0), 4)


def score_nodes(nodes: List[dict]) -> List[dict]:
    """
    Attach an `importance_score` field to every node in the list.

    Args:
        nodes: List of node dicts.

    Returns:
        Same list with `importance_score` added to each node (in-place mutation
        plus return for convenience).
    """
    for node in nodes:
        node["importance_score"] = compute_importance_score(node)
    return nodes


