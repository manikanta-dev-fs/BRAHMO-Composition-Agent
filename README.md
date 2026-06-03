# BRAHMO Composition Agent

Production-style context assembly service for BRAHMO, an AI context system that turns 28 candidate knowledge nodes into a structured, token-safe prompt context.

## What It Does

- Loads 28 candidate nodes from `data/sample_nodes.json`
- Applies distance-based default compression
- Protects `CONSTRAINT` nodes from compression
- Assembles context into fixed 8-block order
- Enforces a strict token budget across all three sources:
  - system prompt
  - rendered context string
  - user message reserve
- Iteratively compresses low `injection_weight` nodes until the final rendered prompt fits
- Fails safely when the budget cannot be met without compressing constraints

## Architecture

```text
main.py               FastAPI app and strict /compose endpoint
token_counter.py      tiktoken counting utilities
importance_scorer.py  importance score metadata
compressor.py         distance defaults and compression transitions
budget_fitter.py      initial iterative budget fitting
block_assembler.py    fixed 8-block routing
context_builder.py    final rendered context string
data/sample_nodes.json 28 hospital-domain candidate nodes
frontend/             Next.js demo UI
tests/                backend safety tests
```

## Token Safety Guarantee

The final guarantee is based on the rendered context string, not only on node estimates.

```text
total = system_prompt_tokens + tiktoken(context_string) + user_reserve_tokens
```

If `total > budget`, the system compresses the lowest `injection_weight` non-constraint node one step:

```text
FULL -> COMPRESSED -> CONSTRAINT_ONLY -> OMIT
```

If all non-constraint nodes are omitted and the total still exceeds budget, `/compose` returns HTTP `422`.

## Block Order

The final context is rendered in this order:

1. ROLE
2. GLOBAL CONSTRAINTS
3. RECENT DECISIONS
4. ACTIVE CONSTRAINTS
5. SESSION CONTEXT
6. OPEN QUESTIONS
7. STALE FLAGS, only when `REVIEW_REQUIRED` nodes exist
8. SESSION BOUNDARIES, including `CAPTURE:`

## Run Backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open:

```text
http://localhost:8000/docs
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## API Examples

Default budget:

```bash
curl -X POST http://localhost:8000/compose \
  -H "Content-Type: application/json" \
  -d '{"budget":4000,"user_id":"U-VIKRAM","patient_id":"PAT-RAJAN"}'
```

Tight budget:

```bash
curl -X POST http://localhost:8000/compose \
  -H "Content-Type: application/json" \
  -d '{"budget":1500}'
```

Impossible budget:

```bash
curl -X POST http://localhost:8000/compose \
  -H "Content-Type: application/json" \
  -d '{"budget":700}'
```

Expected behavior:

- `4000`: fits safely
- `1500`: compresses and fits
- `700`: returns `422`, because constraints cannot safely fit

## Response Highlights

`POST /compose` returns:

- `context_string`
- `token_stats`
- `block_breakdown`
- `node_details`
- `decision_trace` per node
- `compression_log`
- `compression_summary`
- `safety_status`

## Run Tests

```bash
python -m unittest discover -s tests
```

## Demo Talking Points

1. Show the 4000-token successful composition.
2. Show token breakdown: system + context + user reserve.
3. Show fixed 8-block context order.
4. Lower budget to 1500 and show iterative compression.
5. Open compression log and explain each pass.
6. Open a node card and show retrieval weight, injection weight, distance, and decision trace.
7. Show constraints remain `FULL`.
8. Lower budget to 700 and show safe failure instead of unsafe constraint compression.

