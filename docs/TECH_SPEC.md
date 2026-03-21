# GenAnalytics: Technical Specification

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                               |
|  React + Vite + shadcn/ui (production)  |  Streamlit (legacy)    |
+------------------------------------------------------------------+
                         ADK SSE (/run_sse)
+------------------------------------------------------------------+
|                     AGENT LAYER (Google ADK)                      |
|  Root Orchestrator (LlmAgent)                                    |
|  ├── schema_explorer — metadata questions, no SQL                |
|  ├── sql_specialist — writes, validates, self-corrects SQL       |
|  └── viz_recommender — chart type recommendation                 |
|  Root tools: execute_sql                                         |
|  Sub-agent tools: validate_sql, get_sample_data, suggest_viz     |
|  Full terse schema (101 tables) in sub-agent prompts             |
+------------------------------------------------------------------+
              |                           |
+------------------------+    +------------------------+
|    SCHEMA LAYER        |    |    DATA LAYER           |
| Full terse schema in   |    | BigQuery (read-only)    |
|   system prompt        |    | MySQL 8.0               |
| Table enrichments      |    | (sessions, saved        |
|   from YAML            |    |  queries, audit log)    |
+------------------------+    +------------------------+
              |
+------------------------+
|    LLM LAYER           |
|  Gemini 2.5 Flash      |
|  (Vertex AI)           |
+------------------------+
```

---

## 2. Tech Stack

### Current Stack

| Component | Tool | Notes |
|-----------|------|-------|
| Backend | Python + FastAPI (via ADK) | ADK SSE server with custom endpoints |
| Agent Framework | **Google ADK** (multi-agent) | Sub-agents with `transfer_to_agent` routing |
| LLM | **Gemini 2.5 Flash** (Vertex AI) | All agents use same model |
| Database | **MySQL 8.0** | Sessions, saved queries, audit log (via SQLAlchemy async) |
| Schema Strategy | Full terse schema in prompt | 101 tables, ~6.8K tokens |
| Frontend | **Vite + React + shadcn/ui** | ADK SSE streaming, dark mode |
| E2E Tests | Playwright | Mock + real backend tests |

### Why Google ADK for Multi-Agent
- Native `transfer_to_agent` for sub-agent routing
- Built-in SSE server (`get_fast_api_app`)
- `DatabaseSessionService` supports MySQL out of the box
- `after_tool_callback` for audit logging

---

## 3. Agent Design

### Multi-Agent Architecture
```
Root Orchestrator (LlmAgent) — routes, executes SQL, summarizes
├── schema_explorer (LlmAgent) — metadata questions, no SQL
├── sql_specialist (LlmAgent) — writes, validates, self-corrects SQL
└── viz_recommender (LlmAgent) — chart type recommendation
```

**Flow for data questions:**
1. Root → transfer to `sql_specialist` (writes SQL, validates, self-corrects)
2. sql_specialist → transfer back to Root with validated SQL
3. Root → calls `execute_sql`
4. Root → transfer to `viz_recommender`
5. viz_recommender → transfer back to Root with chart recommendation
6. Root → provides natural language summary

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

### Multi-Agent (Implemented — ADK sub-agents)
```
User Question -> [ROOT ORCHESTRATOR] -> transfer_to_agent -> [SQL_SPECIALIST]
                        |                                          |
                  execute_sql                          validate_sql + self-correct
                        |                                          |
                  [VIZ_RECOMMENDER] <--- transfer back --- validated SQL
                        |
                  Natural language summary
```
*Note: Originally planned LangGraph. Switched to ADK native sub-agents — same patterns, no rewrite needed.*

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

### ADK Built-in Endpoints
```
POST   /run_sse                                        SSE streaming (agent execution)
POST   /apps/{app}/users/{user}/sessions               Create session
GET    /apps/{app}/users/{user}/sessions/{id}           Get session
DELETE /apps/{app}/users/{user}/sessions/{id}           Delete session
GET    /health                                         Health check
```

### Custom Endpoints
```
GET    /api/v1/saved-queries       List saved queries
POST   /api/v1/saved-queries       Create saved query
DELETE /api/v1/saved-queries/{id}   Delete saved query
GET    /api/v1/audit-log           Query audit history (limit, offset)
```

**SSE events** (from ADK `/run_sse`): ADK events with `functionCall`, `functionResponse`, `text` parts. Frontend parses these into thinking steps, SQL, results, viz, and explanation.

---

## 7. Security Model

| Layer | Mechanism |
|-------|-----------|
| Read-only access | Service account: BigQuery Data Viewer + Job User only |
| DML prevention | SQL parser rejects non-SELECT before dry-run |
| Dry-run validation | Every query validated before execution |
| Cost limits | `maximumBytesBilled` on every query (500 GB cap) |
| Result limits | Max 100 rows per query (configurable via max_rows param) |
| Audit logging | Every execute_sql call logged to MySQL via ADK callback |
| Auth (Phase 10) | Google OAuth / IAP |

---

## 8. Project Structure

```
gen-analytics/
  backend/
    app/
      main.py                    # ADK SSE server entry point
      config.py                  # Settings (pydantic-settings)
      agent/
        agent.py                 # Multi-agent system (create_agent + create_single_agent)
        prompts.py               # Per-agent prompts (orchestrator, sql_specialist, etc.)
        callbacks.py             # ADK callbacks (audit logging)
        context_loader.py        # Assembles schema with enrichments
        tools/                   # get_sample_data, validate_sql, execute_sql, suggest_viz
      schema/
        formatter.py             # Format as terse schema string for system prompt
        enrichments.py           # Load table enrichments from YAML
      db/
        database.py              # Async SQLAlchemy engine (MySQL/SQLite)
        models.py                # SavedQuery + AuditLog models
      bigquery/
        client.py                # BigQuery client wrapper
        safety.py                # Cost guards, DML detection
        metadata.py              # INFORMATION_SCHEMA queries
      api/routes/
        saved_queries.py         # CRUD for saved queries
        audit.py                 # Read-only audit log endpoint
    agents/
      gen_analytics/agent.py     # ADK agent discovery wrapper
    scripts/
      extract_schema.py          # Extract metadata + generate terse schema (RUN FIRST)
      evaluate.py                # Evaluation harness
      test_agent.py              # End-to-end agent test (dry-run)
    tests/
    pyproject.toml
  frontend/
    react-app/                   # Vite + React + shadcn/ui (production)
      e2e/                       # Playwright tests
    streamlit_app/               # Legacy MVP
  data/
    metadata/table_enrichments.yaml
  docs/
    PRD.md
    TECH_SPEC.md
    phase-1.md through phase-10.md
  docker-compose.yml             # MySQL 8.0 (optional)
```

---

## 9. Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| ADK for multi-agent | Native sub-agents | `transfer_to_agent`, `after_tool_callback`, `DatabaseSessionService` — all built-in |
| ADK over LangGraph | No rewrite needed | Same orchestration patterns, already using ADK from Phase 1 |
| Gemini via Vertex AI | No rate limits | Pay-as-go, auth via service account |
| Full schema in context | Highest accuracy | 101 tables (~6.8K tokens) fits easily in Gemini's 1M context |
| MySQL over SQLite | Production-ready | Concurrent access, ADK native support, Cloud SQL for deployment |
| Flat sub-agents over SequentialAgent | Reliable transfers | SequentialAgent doesn't transfer back to parent; flat sub-agents with explicit transfer work reliably |
| ChromaDB (V1+) -> pgvector (prod) | Progressive infra | No vector DB in MVP. ChromaDB for V1, pgvector for production. |
| Streamlit -> Next.js | Progressive frontend | No JS context-switch during backend focus |
| Multi-turn in MVP | User requirement | Conversation history from day one |
| SSE over WebSocket | Simpler | Unidirectional streaming |

### Streamlit Deployment Note
Streamlit runs as a separate process (port 8501) from FastAPI (port 8000). Two terminal windows during local dev. Streamlit calls FastAPI via HTTP.
