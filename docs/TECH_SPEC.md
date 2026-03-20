# GenAnalytics: Technical Specification

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                               |
|  Streamlit (MVP)  |  Next.js + React (V1+)                       |
+------------------------------------------------------------------+
                         HTTP / SSE
+------------------------------------------------------------------+
|                        API LAYER                                  |
|  FastAPI: POST /query, GET /query/{id}/stream, GET /history,     |
|           POST /feedback, GET /schema/search                      |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                     AGENT LAYER                                   |
|  Google ADK (MVP, free) -> LangGraph (V2)                        |
|  Tools: get_sample_data, validate_sql, execute_sql,              |
|         suggest_viz, explain_query                                |
|  MVP: Full terse schema in system prompt (no RAG needed)         |
|  Self-correction loop: generate -> validate -> [error?] -> retry  |
+------------------------------------------------------------------+
              |                           |
+------------------------+    +------------------------+
|    SCHEMA LAYER        |    |    DATA LAYER           |
| MVP: Full terse schema |    | BigQuery (read-only)    |
|   in system prompt     |    | SQLite (MVP) /          |
| V1+: + ChromaDB for    |    | PostgreSQL (prod)       |
|   glossary, examples,  |    | (history, sessions,     |
|   rich metadata        |    |  feedback, audit)       |
+------------------------+    +------------------------+
              |
+------------------------+
|    LLM LAYER           |
| MVP:                   |
|  - Gemini 2.5 Flash    |
|    (Vertex AI)          |
| V1+:                   |
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
| Frontend | **Streamlit** | Free | Apache 2.0 | Runs as separate process from FastAPI (port 8501 vs 8000) |
| Charts | Plotly (via Streamlit) | Free | MIT | |
| Data Store | SQLite | Free | Public domain | For session history, feedback |
| Deployment | Local | Free | | Two processes: FastAPI + Streamlit |

### Production Stack (V1+)

| Component | Tool | Cost | Notes |
|-----------|------|------|-------|
| Agent Framework | LangGraph | Free (MIT) | Multi-agent orchestration |
| LLM (simple) | Gemini Flash | Free tier or pay-as-go | Simple queries, embeddings, routing |
| LLM (moderate) | Claude Sonnet 4 via Vertex AI | ~$3/M input tokens | Multi-table queries |
| LLM (complex) | Claude Opus 4 via Vertex AI | ~$15/M input tokens | Complex analysis |
| Vector DB | pgvector / AlloyDB | Paid (GCP) | Production-grade |
| Frontend | Next.js + React | Free (MIT) | SSE streaming |
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

### V1+: Add RAG as Supplement (Not Replacement)

Full terse schema stays in context. RAG adds supplementary information:

1. **business_glossary**: Map terms like "churn", "MRR", "CAC" to SQL patterns
2. **query_examples**: Few-shot examples of similar questions with vetted SQL
3. **rich_metadata**: Detailed descriptions, sample values, join hints for top candidate tables

This "belt and suspenders" approach gives highest accuracy: full schema for table discovery + RAG for business context.

### V2: RAG for Claude Models (Mandatory)

Claude Sonnet/Opus have 200K context -- full schema doesn't fit. For Claude-routed queries, use RAG to select top 10-20 tables.

### Metadata Pipeline (needed for all phases)
1. Extract raw metadata from BigQuery `INFORMATION_SCHEMA`
2. Format as terse schema string for system prompt injection
3. (V1+) Enrich with business descriptions, embed in ChromaDB

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

```
POST   /api/v1/query              Submit NL question -> returns query_id + stream_url
GET    /api/v1/query/{id}/stream  SSE stream: status -> sql -> results -> viz -> done
GET    /api/v1/query/{id}         Get completed result (polling fallback)
GET    /api/v1/history            Session query history
POST   /api/v1/feedback           Thumbs up/down
GET    /api/v1/schema/search      Search table metadata
```

**SSE events**: `status`, `sql`, `results`, `visualization`, `explanation`, `done`, `error`

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
      main.py                    # FastAPI entry point
      config.py                  # Settings (pydantic-settings)
      agent/
        agent.py                 # Google ADK agent definition (MOST IMPORTANT FILE)
        prompts.py               # System prompts
        context_loader.py        # Assembles schema with enrichments
        tools/                   # get_sample_data, validate_sql, execute_sql, suggest_viz
        # Future (V1+):
        # complexity.py          # Query complexity classifier
        # model_router.py        # Model selection
        # langgraph/             # V2 multi-agent (graph.py, state.py, agents/)
      schema/
        formatter.py             # Format as terse schema string for system prompt
        enrichments.py           # Load table enrichments from YAML
      # Future (V1+):
      # rag/                     # NOT needed for MVP
      #   embeddings.py, retriever.py, reranker.py, collections.py
      bigquery/
        client.py                # BigQuery client wrapper
        safety.py                # Cost guards, DML detection
        metadata.py              # INFORMATION_SCHEMA queries
      # Future (V1+):
      # api/routes/              # SSE streaming endpoints (Phase 7)
      # models/                  # Pydantic data models
      # services/                # Business logic services
    scripts/
      extract_schema.py          # Extract metadata + generate terse schema (RUN FIRST)
      evaluate.py                # Evaluation harness
      test_agent.py              # End-to-end agent test (dry-run)
      # Future (V1+):
      # seed_glossary.py         # Seed business glossary
      # seed_examples.py         # Seed curated query examples
    tests/
    pyproject.toml
    # Future: Dockerfile
  frontend/
    streamlit_app/               # MVP
    # Future (V1+): nextjs_app/  # Phase 7
  data/
    metadata/table_enrichments.yaml
    # Future (V1+):
    # glossary/business_terms.yaml
    # examples/query_examples.yaml
  docs/
    PRD.md
    TECH_SPEC.md
    phase-1.md through phase-10.md
  # Future: docker-compose.yml, Makefile
```

---

## 9. Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Google ADK for MVP | Free + learns agent patterns | Works with Vertex AI, native Gemini support |
| Gemini via Vertex AI | No rate limits | Pay-as-go, auth via service account |
| Full schema in context for MVP | Highest accuracy | Gemini's 1M context fits 500 tables (~250K tokens). Eliminates RAG retrieval errors. |
| RAG as supplement in V1+ | Belt + suspenders | Full schema stays; RAG adds glossary, examples, rich metadata. NOT for table discovery. |
| gemini-embedding-001 for V1+ | Free | Same API key as LLM |
| ChromaDB (V1+) -> pgvector (prod) | Progressive infra | No vector DB in MVP. ChromaDB for V1, pgvector for production. |
| Streamlit -> Next.js | Progressive frontend | No JS context-switch during backend focus |
| Multi-turn in MVP | User requirement | Conversation history from day one |
| SSE over WebSocket | Simpler | Unidirectional streaming |

### Streamlit Deployment Note
Streamlit runs as a separate process (port 8501) from FastAPI (port 8000). Two terminal windows during local dev. Streamlit calls FastAPI via HTTP.
