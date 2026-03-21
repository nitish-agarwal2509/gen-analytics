# GenAnalytics

Natural language analytics tool for BigQuery. Ask questions in plain English, get SQL + results.

## Project Structure

```
backend/           Python backend (ADK SSE server + multi-agent system)
  app/
    agent/         Multi-agent definition (orchestrator + sub-agents) + tools + callbacks
    bigquery/      BigQuery client, safety, metadata extraction
    schema/        Terse schema formatter for system prompt injection
    db/            SQLAlchemy async (MySQL/SQLite) — models, engine, session factory
    api/routes/    Custom endpoints (saved_queries, audit_log)
    config.py      Settings via pydantic-settings
    main.py        ADK SSE server entry point
  agents/          ADK agent discovery directory
    gen_analytics/ ADK-compatible agent wrapper
  scripts/         Utility scripts (extract_schema, test_bq_connection, etc.)
  tests/
frontend/
  streamlit_app/   Streamlit chat UI (MVP, still works)
  react-app/       Vite + React + shadcn/ui (production frontend)
data/              Table enrichments metadata
docs/              PRD, Tech Spec, phase docs (phase-1 through phase-10)
```

## Development

```bash
# MySQL (local via Homebrew)
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gen_analytics"

# Backend (ADK SSE server)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # ADK SSE on port 8000

# Frontend — React (production)
cd frontend/react-app
npm run dev                            # Vite on port 5173

# Frontend — Streamlit (legacy MVP)
cd frontend/streamlit_app
streamlit run app.py                   # Streamlit on port 8501
```

## Environment

- Python 3.14, virtual env at `backend/.venv/`
- Config loaded from `backend/.env` via pydantic-settings
- BigQuery auth: service account key JSON (`GOOGLE_APPLICATION_CREDENTIALS`)
- GCP Project: `sm-apps-core` (76 datasets, 500+ tables)
- Agent schema: dynamically loaded from `backend/data/schema_metadata.json` (101 tables, ~6.8K tokens)
- Schema refresh: `cd backend && python scripts/extract_schema.py <datasets...>`
- LLM: Gemini 2.5 Flash via Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`)
- MySQL: local via Homebrew (`MYSQL_URL=mysql+aiomysql://root@localhost:3306/gen_analytics`)

## Key Decisions

- **Full terse schema in system prompt** (not RAG) for MVP — Gemini's 1M context fits all tables
- **Google ADK** for agent framework + multi-agent orchestration, Gemini via Vertex AI
- **RAG deferred to V1+** as supplement only (glossary + examples), not for table discovery
- **Validate-before-execute**: Agent always calls `validate_sql` (dry-run) before `execute_sql`
- **Cost guard**: `maximumBytesBilled` set to 500 GB on every query execution
- **Human-in-the-loop**: Queries scanning >500 GB require user approval before execution
- All scripts run from `backend/` directory with venv activated
- Test script defaults to dry-run mode ($0 BQ cost): `python scripts/test_agent.py`
- Eval harness: `python scripts/evaluate.py` (35 test cases, dry-run, baseline 91.4%)

## Phase Status

- [x] Phase 1: Hello World Agent (scaffolding, BigQuery, execute_sql, Gemini, ADK agent, Streamlit UI)
- [x] Phase 2: Full Schema Extraction (101 tables, dynamic loading, 8/8 test queries pass)
- [x] Phase 3: Validation & Self-Correction (validate_sql, safety module, cost guards, human-in-the-loop)
- [x] Phase 4: Visualization & Polish (suggest_viz, Plotly charts, thinking steps, session sidebar)
- [x] Phase 5: Business & Domain Context (table enrichments, 3 domain rules, glossary/examples as data files for eval)
- [x] Phase 6: Complex Query Handling (eval harness 91.4% accuracy; recipes/strategies skipped — not needed)
- [x] Phase 7: React Frontend (ADK SSE streaming, Vite + React + shadcn/ui, dark mode, saved queries, Playwright e2e tests)
- [x] Phase 8: Multi-Turn Conversations (ADK sessions, pronoun resolution, follow-ups, clear session reset)
- [x] Phase 9: Multi-Agent + MySQL (ADK sub-agents, MySQL persistence, audit logging, session persistence)
- [ ] Phase 10: Production Deployment (auth, Cloud SQL, Cloud Run, monitoring)
