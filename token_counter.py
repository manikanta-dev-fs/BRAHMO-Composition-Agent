"""
token_counter.py — Token counting utilities using tiktoken.
Handles per-string token counts and full budget calculations.
"""

import tiktoken

# ── Encoding Setup ───────────────────────────────────────────────────────────
ENCODING_NAME = "cl100k_base"
_encoder = tiktoken.get_encoding(ENCODING_NAME)


def count_tokens(text: str) -> int:
    """
    Count the number of tokens in a given string using cl100k_base encoding.

    Args:
        text: The input string to tokenize.

    Returns:
        Integer token count.
    """
    if not text:
        return 0
    return len(_encoder.encode(text))


def estimate_node_tokens(node: dict) -> dict:
    """
    Estimate token counts for all content variants of a node.
    Useful when tokens_* fields are missing in the source data.

    Args:
        node: A node dict with content_full, content_compressed,
              content_constraint_only fields.

    Returns:
        dict with tokens_full, tokens_compressed, tokens_constraint_only.
    """
    return {
        "tokens_full": count_tokens(node.get("content_full", "")),
        "tokens_compressed": count_tokens(node.get("content_compressed", "")),
        "tokens_constraint_only": count_tokens(node.get("content_constraint_only", "")),
    }
