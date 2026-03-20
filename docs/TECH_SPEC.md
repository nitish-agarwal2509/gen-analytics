# GenAnalytics: Technical Specification

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                               |
|  Streamlit (MVP)  |  Vite + React + MUI + Emotion (V1+)          |
+------------------------------------------------------------------+
                         HTTP / SSE
+------------------------------------------------------------------+
|                        API LAYER                                  |
|  ADK built-in: POST /run_sse (SSE streaming),                    |
|    session CRUD, /list-apps                                       |
|  Custom: saved queries, feedback, health check                    |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     AGENT LAYER                                   |
|  Google ADK (MVP + V1) -> LangGraph (V2)                         |
|  Tools: get_sample_data, validate_sql, execute_sql, suggest_viz  |
|  Full terse schema + enrichments in system prompt (no RAG)       |
|  Self-correction loop: generate -> validate -> [error?] -> retry  |
+------------------------------------------------------------------+
              |                           |
+------------------------+    +------------------------+
|    SCHEMA LAYER        |    |    DATA LAYER           |
| Full terse schema      |    | BigQuery (read-only)    |
|   in system prompt     |    | SQLite (sessions,       |
| + table enrichments    |    |  saved queries,         |
|   (descriptions,       |    |  feedback, audit)       |
|    column notes)       |    |                         |
+------------------------+    +------------------------+
              |
+------------------------+
|    LLM LAYER           |
| MVP + V1:              |
|  - Gemini 2.5 Flash    |
|    (Vertex AI)          |
| V2 (optional):         |
|  - + Claude Sonnet/Opus |
|    (Vertex AI)          |
+------------------------+
```

---

## 2. Tech Stack

### MVP Stack -- ALL FREE ($0 cost)

| Component | Tool | Cost | License | Notes |
|-----------|------|------|---------|-------|
| Backend | Python + FastAPI | Free | MIT | Best AI/ML ecosystem |
| Agent Framework | **Google ADK** | Free | Apache 2.0 | Works with Vertex AI, has built-in dev UI (`adk web`) |
| LLM | **Gemini 2.5 Flash** (Vertex AI) | Pay-as-go | GCP | No rate limits. Auth via service account. |
| Schema Strategy | Full terse schema in system prompt | Free | N/A | ~250K tokens for 500 tables. Fits in Gemini's 1M context. No vector DB needed for MVP. |
| Frontend | **Vite + React + MUI + Emotion** | Free | MIT | SSE streaming via ADK `/run_sse`, dark mode, saved queries |
| Charts | Recharts (React) / Plotly (Streamlit fallback) | Free | MIT | Bar, line, area, metric card |
| SQL Highlighting | CodeMirror | Free | MIT | Collapsible SQL viewer |
| Data Store | SQLite | Free | Public domain | ADK sessions, saved queries |
| Deployment | Local | Free | | Backend (port 8000) + Vite dev (port 3000) |

### Production Stack (V1+)

| Component | Tool | Cost | Notes |
|-----------|------|------|-------|
| Agent Framework | LangGraph | Free (MIT) | Multi-agent orchestration |
| LLM (simple) | Gemini Flash | Free tier or pay-as-go | Simple queries, embeddings, routing |
| LLM (moderate) | Claude Sonnet 4 via Vertex AI | ~$3/M input tokens | Multi-table queries |
| LLM (complex) | Claude Opus 4 via Vertex AI | ~$15/M input tokens | Complex analysis |
| Session/Data Store | SQLite (dev) / PostgreSQL (prod) | Free / Paid | ADK sessions, saved queries, feedback |
| Frontend | Vite + React + MUI + Emotion | Free (MIT) | SSE streaming, dark mode, saved queries |
| Deployment | Cloud Run | Pay-as-go | Serverless |

### Why Google ADK over Claude Agent SDK for MVP
- Google ADK works natively with Gemini via Vertex AI
- ADK has built-in dev UI (`adk web`) and FastAPI server (`adk api_server`)
- ADK is model-agnostic -- can switch to Claude/LangGraph later

---

## 3. Agent Design

### System Prompt (conceptual -- MVP)
```
You are a data analyst assistant with access to a BigQuery warehouse.
The FULL SCHEMA of all available tables is provided below.

1. Understand the user's question
2. Identify relevant tables from the schema below
3. Generate BigQuery SQL
4. ALWAYS validate with validate_sql before execution
5. Execute and present results with visualization

RULES: Always validate SQL, always use partition filters, NEVER generate DML,
max 3 self-correction attempts, show reasoning about table selection.

SCHEMA:
{terse_schema_string}   <-- ~250K tokens of all 500+ tables
```

**Why full schema in context (not RAG):**
- Gemini 2.5 Flash has 1M token context. 500 tables in terse format = ~250K tokens. Fits easily.
- Eliminates RAG retrieval errors (the #1 failure mode in NL-to-SQL systems).
- LLM can reason over ALL tables simultaneously for cross-table joins.
- Dramatically simpler architecture for MVP.
- RAG added in V1 as supplement (glossary, examples) not replacement.

### Tool Definitions (MVP)

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `get_sample_data` | Preview rows to understand data patterns | table_name, limit | {rows, columns} |
| `validate_sql` | Dry-run + cost estimation | sql | {is_valid, errors, estimated_bytes, estimated_cost} |
| `execute_sql` | Run validated SQL | sql, max_rows | {columns, rows, bytes_processed, execution_time} |
| `suggest_viz` | Recommend chart type | columns, row_count, intent | {chart_type, x_axis, y_axis, title} |
| `explain_query` | NL explanation of SQL (V1) | sql, context | {explanation, key_assumptions} |

Note: `search_tables` and `get_schema` are NOT needed for MVP -- the full schema is already in context.

### Self-Correction Loop
```
User Question + Full Schema in Context -> Generate SQL
     -> [validate_sql] -> Valid? -> [execute_sql] -> Success? -> Return results
                            |                            |
                         Invalid                       Fail
                            |                            |
                      Analyze Error <--------------------+
                            |
                   retry_count < 3? -> Yes -> Regenerate SQL (with error context)
                            |
                           No -> Return error with explanation
```

### Multi-Agent Architecture (V2 - LangGraph)
```
User Question -> [PLANNER] -> [SCHEMA AGENT] -> [SQL AGENT] -> [VALIDATOR] -> [VIZ AGENT]
                    |              |                  |
               Classifies    Finds tables,       Generates SQL
               complexity    resolves joins       (model varies)
```

---

## 4. Schema Strategy

### MVP: Full Terse Schema in Context (No RAG)

**How it works:**
1. Extract all table/column metadata from BigQuery `INFORMATION_SCHEMA`
2. Format as terse schema string: `orders: order_id(INT), customer_id(INT), amount(FLOAT), status(STR), created_at(TS)`
3. Inject entire schema (~250K tokens for 500 tables) into the system prompt
4. LLM sees ALL tables and can reason about any of them

**Token budget:**
- Terse schema: ~250K tokens
- Conversation context: ~10K tokens
- Question + response: ~5K tokens
- Total: ~265K tokens (fits in Gemini's 1M context with room to spare)

**Note:** Using Vertex AI — no TPM/RPD rate limits that affect development.

### V1+: Table Enrichments (Shipped in Phase 5)

Full terse schema stays in context. Enrichments add business context inline:
- Table descriptions ("Payout disbursements to users")
- Column notes ("amount in paisa, divide by 100 for INR")
- Status enum values, foreign key hints

Total: ~7.8K tokens (schema + enrichments). Trivially fits in Gemini's 1M context.

**RAG was evaluated and rejected** — glossary and few-shot examples in the prompt caused the agent to overthink and pick wrong tables. Enriched schema + 3 domain rules alone achieve 91.4% accuracy.

### Metadata Pipeline
1. Extract raw metadata from BigQuery `INFORMATION_SCHEMA`
2. Format as terse schema string for system prompt injection
3. Merge table enrichments from `data/metadata/table_enrichments.yaml`

---

## 5. Model Routing

### MVP -- Gemini via Vertex AI

| Complexity | Model | Cost/Query |
|------------|-------|------------|
| ALL | Gemini 2.5 Flash (Vertex AI) | ~$0.0003 |

### V1+ -- Paid Hybrid Routing

| Complexity | Model | When | Cost/Query |
|------------|-------|------|------------|
| LOW | Gemini Flash | Single table, simple aggregation | ~$0.0003 |
| MEDIUM | Claude Sonnet 4 (Vertex AI) | 2-3 table joins, GROUP BY | ~$0.016 |
| HIGH | Claude Opus 4 (Vertex AI) | Cohorts, funnels, statistical | ~$0.20 |

---

## 6. API Design

### ADK Built-in Endpoints
```
POST   /run_sse                                    SSE stream: ADK events (text, functionCall, functionResponse)
POST   /apps/{agent}/users/{user}/sessions         Create new session
GET    /apps/{agent}/users/{user}/sessions/{id}    Load session history
GET    /list-apps                                  Available agents
```

### Custom Endpoints (alongside ADK)
```
POST   /api/v1/queries/saved     Save a query
GET    /api/v1/queries/saved     List saved queries
POST   /api/v1/feedback          Thumbs up/down
GET    /health                   Health check
```

### MVP Endpoints (Streamlit — will be replaced by ADK endpoints)
```
POST   /api/v1/query              Submit NL question -> returns query_id + stream_url
GET    /api/v1/query/{id}/stream  SSE stream: status -> sql -> results -> viz -> done
```

**ADK SSE event format**: `text` (partial/complete), `functionCall` (tool invocation), `functionResponse` (tool result)

---

## 7. Security Model

| Layer | Mechanism |
|-------|-----------|
| Read-only access | Service account: BigQuery Data Viewer + Job User only |
| DML prevention | SQL parser rejects non-SELECT before dry-run |
| Dry-run validation | Every query validated before execution |
| Cost limits | `maximumBytesBilled` on every query (default 10GB) |
| Partition enforcement | Agent must include partition filters |
| Result limits | Max 1000 rows per query |
| Auth (V1) | Google OAuth 2.0 |
| Row-level security (V1) | BigQuery RLS + authorized views |
| Audit (V1) | Full query trail |

---

## 8. Project Structure

```
gen-analytics/
  backend/
    app/
      main.py                    # FastAPI entry point (V1+: ADK get_fast_api_app())
      config.py                  # Settings (pydantic-settings)
      api/routes/                # Custom endpoints (saved queries, feedback, health)
      agent/
        agent.py                 # Google ADK agent definition
        prompts.py               # System prompts with domain rules
        context_loader.py        # Loads schema + enrichments for prompt
        tools/                   # get_sample_data, validate_sql, execute_sql, suggest_viz
        langgraph/               # V2 multi-agent (graph.py, state.py, agents/)
      schema/
        extractor.py             # Extract metadata from BigQuery INFORMATION_SCHEMA
        formatter.py             # Format as terse schema string for system prompt
        enrichments.py           # Table enrichment YAML loader
      bigquery/
        client.py                # BigQuery client wrapper
        safety.py                # Cost guards, DML detection
        metadata.py              # INFORMATION_SCHEMA queries
      models/                    # Pydantic data models
      services/                  # Business logic services
    scripts/
      extract_schema.py          # Extract metadata + generate terse schema (RUN FIRST)
      evaluate.py                # Evaluation harness (35 test cases, 91.4% baseline)
      measure_prompt.py          # Token breakdown by section
    tests/
      eval/                      # simple/medium/complex query YAML test cases
    pyproject.toml
    Dockerfile
  frontend/
    streamlit_app/               # MVP (Streamlit)
    web/                         # V1+ (Phase 7) -- Vite + React + MUI + Emotion
  data/
    metadata/table_enrichments.yaml  # Table descriptions + column notes
  docs/
    PRD.md
    TECH_SPEC.md
    phase-1.md through phase-10.md
  docker-compose.yml
```

---

## 9. Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Google ADK | Free + learns agent patterns | Works with Vertex AI, native Gemini support, built-in SSE + sessions |
| Gemini via Vertex AI | No rate limits | Pay-as-go, auth via service account |
| Full schema in context | Highest accuracy | Gemini's 1M context fits 101 tables (~6.8K tokens). Eliminates RAG retrieval errors. |
| Table enrichments over RAG | Simpler, better results | Glossary/examples in prompt caused agent to overthink. Enriched schema + 3 domain rules = 91.4% accuracy. |
| Streamlit (MVP) -> Vite + React + MUI (V1+) | Progressive frontend | SPA like Metabase/Superset; MUI for fast development |
| ADK built-in SSE | Simplest streaming option | `/run_sse` + session management for free; custom routes only for saved queries |
| SSE over WebSocket | Simpler | Unidirectional streaming sufficient for query results |

### Deployment Notes
- **MVP (Streamlit)**: Two processes — FastAPI (port 8000) + Streamlit (port 8501). Streamlit calls FastAPI via HTTP.
- **V1+ (React)**: ADK serves backend (port 8000) + static frontend at `/web`. Single process possible.
