# Architecture Notes — BRAHMO Composition Agent

## Overview

The Composition Agent transforms 28 raw candidate nodes (pre-filtered by the Rules Engine) into a structured, token-efficient context string that fits within a hard token ceiling — ready for system-level injection into an AI session.

---

## Data Flow

```
28 Candidate Nodes (from Rules Engine)
        ↓
  [1] Dual Importance Scoring (~20ms)
        ↓
  [2] Distance-Weighted Compression Assignment (~30ms)
        ↓
  [3] 8-Block Assembly (~30ms)
        ↓
  [4] 3-Source Token Counting (BEFORE any API call)
        ↓
  [5] Iterative Budget Enforcement Loop (~50ms)
        ↓
  [6] Context String Builder
        ↓
  Final Context String (≤3,000 tokens) + Composition Metadata
```

---

## Module Breakdown

### `token_counter.py`
Uses **tiktoken** with `cl100k_base` encoding (Claude-compatible). Counts ALL THREE sources:
- **System prompt**: ~800 tokens (fixed overhead)
- **Context string**: variable, the output we're optimizing
- **User message reserve**: 200 tokens (estimated)

> ⚠️ Critical: Total = system + context + user. Counting only context misses ~1,000 tokens.

### `importance_scorer.py`
Computes dual importance weights per node:
- **`retrieval_weight`** (0.0–1.0): Set by Rules Engine. "Should this be in the candidate set?" High = important for recall.
- **`injection_weight`** (0.0–1.0): Set by Composition Agent. "How much token space should this get?" High = full content, Low = compress first.

These are two separate questions answered by two different weights.

### `block_assembler.py`
Sorts nodes into 8 blocks in **locked order** (never reordered):

| Block | Name | Content |
|-------|------|---------|
| 1 | Role Frame | Dynamic: user + org + patient |
| 2 | Global Constraints | `type=CONSTRAINT` AND `zone=2` — ALWAYS FULL |
| 3 | Recent Decisions | `type=DECISION`, sorted by recency |
| 4 | Active Constraints | `type=CONSTRAINT` AND `zone=1` — ALWAYS FULL |
| 5 | Session Context | FACTs + ANTI_PATTERNs + remaining DECISIONs |
| 6 | Open Questions | Empty in v0.1 (reserved) |
| 7 | Stale Flags | `status=REVIEW_REQUIRED` — **block omitted if empty** |
| 8 | Session Boundaries | Static CAPTURE: instruction |

### `compressor.py`
Assigns initial compression levels based on **distance from entry point**:

| Distance | Default Level | Approx Tokens |
|----------|--------------|---------------|
| 0–1 | FULL | ~150 tokens/node |
| 2 | COMPRESSED | ~50 tokens/node |
| 3+ | CONSTRAINT_ONLY | ~20 tokens/node |

**Exception: `type=CONSTRAINT` nodes are ALWAYS FULL regardless of distance.**

### `budget_fitter.py` — The Core Loop
```
total = system_prompt_tokens + context_tokens + user_reserve_tokens
WHILE total > TOKEN_BUDGET:
    target = find node with LOWEST injection_weight that is NOT a CONSTRAINT and NOT OMIT
    if no target: flag error — constraints alone exceed budget
    compress target: FULL → COMPRESSED → CONSTRAINT_ONLY → OMIT
    recalculate total
```

**Why lowest injection_weight first?** Injection weight measures how much token space a node deserves. Low injection = compress first. CONSTRAINT nodes bypass this entirely — they're never candidates for compression.

### `context_builder.py`
Concatenates blocks in order with section headers:
```
=== ROLE ===
...

=== GLOBAL CONSTRAINTS ===
...

=== SESSION BOUNDARIES ===
CAPTURE: [any new decisions]
```

---

## Compression Ordering — Why This Order?

1. **Type overrides distance** for CONSTRAINTs: A CONSTRAINT at distance 4 stays FULL. A FACT at distance 0 can be omitted if injection_weight is low.
2. **Injection weight determines compression priority**: Nodes with lowest injection_weight are compressed first. This respects editorial judgment — the Composition Agent knows which facts are less critical.
3. **Distance determines default level**: Nodes closer to the entry point are more likely to be relevant right now, so they get more tokens by default.
4. **Iterative not batch**: We compress one node at a time (the worst offender), then recheck budget. This is more precise than batch compression and avoids over-compression.

---

## CONSTRAINT Protection — The Sacred Rule

CONSTRAINT nodes represent non-negotiable safety rules (e.g., "Never give Rajan NSAIDs"). These are **never** candidates for compression, regardless of:
- Distance from entry point
- Token budget pressure
- Number of remaining non-CONSTRAINT nodes

If compressing all non-CONSTRAINTs still doesn't satisfy the budget, the system:
1. Returns a `budget_warning` flag
2. Does NOT compress CONSTRAINTs
3. The application should surface this to the user as "Increase budget or review CONSTRAINT set"

---

## Edge Case: Constraints Exceed Budget Alone

If `sum(CONSTRAINT tokens at FULL) > context_budget`:
- All non-CONSTRAINTs are OMITTED
- CONSTRAINTs remain at FULL
- A human override / budget increase is required
- The system never truncates safety-critical information

---

## Token Cost Savings (Assessment Q&A)

| Scale | Sessions/day | Token cost without composition | With composition | Daily savings |
|-------|-------------|-------------------------------|------------------|---------------|
| 50 engineers | 10 each | $0.12/session | $0.05/session | $35/day |
| Annual (250 days) | — | — | — | **$8,750/year** |
| 500 engineers | — | — | — | **$87,500/year** |

Composition reduces token usage by ~58% through smart compression — not by truncating critical safety info, but by summarizing and omitting low-priority facts.

---

## Compression Quality Decision

We use **pre-generated compression levels** at node creation time (Option C from the thinking guide):
- Fast at composition time (no LLM call needed)
- Consistent compression quality
- Storage overhead is minimal (3 text fields per node)
- Composition ordering and compression decisions are deterministic — LLM is only used for the chat *after* composition

---

## Anti-Patterns Avoided

| Anti-Pattern | Consequence | How We Avoid It |
|---|---|---|
| Count only context string | Miss 1,000 tokens (system+user) | Always count 3 sources |
| Compress CONSTRAINTs first | Safety-critical info lost | Type-based protection |
| Count after API call | Overspend already happened | Budget checked before call |
| Character count ÷ 4 | ±30-40% inaccurate | tiktoken cl100k_base |
| Single-pass compression | May over- or under-compress | Iterative loop |
| Include Block 7 when empty | Wasted tokens | Block 7 omitted if no REVIEW_REQUIRED |
| Hardcoded block sizes | Breaks with real content | Dynamic per-block token counts |
| LLM for compression decisions | Slow, expensive, non-deterministic | Deterministic algorithm |
