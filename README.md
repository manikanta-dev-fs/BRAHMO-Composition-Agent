# BRAHMO Composition Agent

A production-grade context composition engine that transforms pre-filtered organizational knowledge nodes into structured, token-safe prompt contexts for AI-assisted clinical decision support.

Built as the middle layer between a Rules Engine (which selects candidate nodes from an 842-node knowledge graph) and an LLM session, the Composition Agent ensures that every injected context respects strict token budgets while preserving safety-critical constraints.

## Key Features

- **Token Budget Enforcement** — Three-source budget accounting (system prompt + rendered context + user reserve) with iterative compression to guarantee the final output never exceeds the ceiling.
- **Constraint Protection** — `CONSTRAINT`-type nodes are never compressed or omitted, regardless of budget pressure. Safety-critical information is always preserved at full fidelity.
- **8-Block Structured Context** — Nodes are routed into a fixed-priority block order (Role → Global Constraints → Decisions → Active Constraints → Session Context → Open Questions → Stale Flags → Boundaries) for deterministic, predictable prompt assembly.
- **Distance-Weighted Compression** — Initial compression levels are assigned based on graph distance from the session entry point, with four degradation tiers: `FULL → COMPRESSED → CONSTRAINT_ONLY → OMIT`.
- **Iterative Compression Loop** — When over-budget, the engine compresses the lowest `injection_weight` non-constraint node one tier at a time, recalculating after each step to avoid over-compression.
- **Safe Failure** — If constraints alone exceed the budget, the system returns a structured error (HTTP 422) instead of silently truncating critical information.
- **Full Observability** — Every composition returns per-node decision traces, compression logs, block-level token breakdowns, and a safety status flag.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     POST /compose                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Load 28 candidate nodes from data source                    │
│  2. Estimate token counts per compression variant (tiktoken)    │
│  3. Assign distance-based compression levels                    │
│  4. Compute importance scores (type × weight × distance decay)  │
│  5. Route nodes into 8 structural blocks                        │
│  6. Enforce token budget via iterative compression              │
│  7. Render final context string with block headers              │
│  8. Verify rendered total ≤ budget (post-render guarantee)      │
│  9. Return context + full composition metadata                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── main.py                  FastAPI application and /compose endpoint
├── token_counter.py         tiktoken-based token counting (cl100k_base)
├── importance_scorer.py     Dual-weight importance scoring per node
├── compressor.py            Compression level assignment and transitions
├── budget_fitter.py         Iterative budget enforcement engine
├── block_assembler.py       8-block structural routing
├── context_builder.py       Final context string renderer
├── data/
│   └── sample_nodes.json    28 hospital-domain candidate nodes
├── tests/
│   └── test_compose.py      Backend composition safety tests
├── docs/
│   └── architecture.md      Detailed architecture documentation
├── frontend/                Next.js dashboard for composition visualization
│   ├── src/app/             App layout and main page
│   ├── src/components/      UI components (BudgetBar, NodeCard, CompressionLog, etc.)
│   └── src/lib/             API client
└── requirements.txt         Python dependencies
```

## Token Safety Guarantee

The system enforces a strict post-render token guarantee:

```
total = system_prompt_tokens + tiktoken(rendered_context_string) + user_reserve_tokens
```

This is verified against the **actual rendered output**, not pre-render estimates. If `total > budget`, the engine iteratively compresses the lowest-priority non-constraint node through the degradation chain:

```
FULL → COMPRESSED → CONSTRAINT_ONLY → OMIT
```

If all non-constraint nodes are exhausted and the budget still cannot be met, the endpoint returns HTTP `422` with a structured error — it never silently drops constraints.

## Context Block Order

| Block | Name | Content |
|-------|------|---------|
| 1 | Role | Dynamic user + organization + patient frame |
| 2 | Global Constraints | `CONSTRAINT` nodes with `zone=2` — always `FULL` |
| 3 | Recent Decisions | `DECISION` nodes, sorted by relevance |
| 4 | Active Constraints | `CONSTRAINT` nodes with `zone=1` — always `FULL` |
| 5 | Session Context | `FACT`, `ANTI_PATTERN`, and remaining nodes |
| 6 | Open Questions | Reserved for future use |
| 7 | Stale Flags | `REVIEW_REQUIRED` nodes — block omitted if empty |
| 8 | Session Boundaries | Static `CAPTURE:` instruction for knowledge graph feedback |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ (for the frontend dashboard)

### Backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API documentation is available at `http://localhost:8000/docs`.

### Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

The dashboard is available at `http://localhost:3000`.

### Run Tests

```bash
python -m pytest tests/ -v
```

## API Reference

### `POST /compose`

Composes a token-budget-safe context string from candidate nodes.

**Request Body:**

```json
{
  "budget": 4000,
  "user_id": "U-VIKRAM",
  "patient_id": "PAT-RAJAN"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `budget` | `int` | `4000` | Maximum total token ceiling |
| `user_id` | `string` | `U-VIKRAM` | User profile identifier |
| `patient_id` | `string` | `PAT-RAJAN` | Patient profile identifier |
| `data_file` | `string` | `null` | Optional path to a custom node data file |

**Response Fields:**

| Field | Description |
|-------|-------------|
| `context_string` | The final rendered context string, ready for LLM injection |
| `token_stats` | Breakdown of system, context, and reserve token usage |
| `block_breakdown` | Per-block node count and token usage |
| `node_details` | Per-node metadata including compression decisions and decision traces |
| `compression_log` | Pass-by-pass record of every compression action taken |
| `compression_summary` | Count of nodes at each compression level |
| `safety_status` | `FIT` (no compression needed) or `COMPRESSED_TO_FIT` |
| `constraints_protected` | Number of constraint nodes preserved at `FULL` |

### `GET /users`

Returns the list of available user profiles.

### `GET /patients`

Returns the list of available patient profiles.

## Design Decisions

- **tiktoken over heuristic counting** — Character-count-based estimation (chars ÷ 4) introduces ±30–40% error. We use OpenAI's `cl100k_base` tokenizer for exact counts.
- **Pre-generated compression variants** — Each node stores three content variants (`content_full`, `content_compressed`, `content_constraint_only`) at creation time. This makes composition deterministic and fast with zero LLM calls at runtime.
- **Iterative over batch compression** — Compressing one node per iteration (lowest `injection_weight` first) avoids over-compression and preserves maximum information within the budget.
- **Post-render verification** — Token counts are verified on the final rendered string, not on per-node estimates, eliminating drift from block headers, formatting, and separators.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, Pydantic |
| Tokenization | tiktoken (`cl100k_base`) |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Testing | pytest, unittest |

## License

This project is part of the BRAHMO organizational AI platform.
