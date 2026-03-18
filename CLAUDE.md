# GenAnalytics

Natural language analytics tool for BigQuery. Ask questions in plain English, get SQL + results.

## Project Structure

```
backend/           Python backend (FastAPI + Google ADK agent)
  app/
    agent/         Agent definition + tools (execute_sql, validate_sql, etc.)
    bigquery/      BigQuery client, safety, metadata extraction
    schema/        Terse schema formatter for system prompt injection
    api/routes/    FastAPI endpoints
    config.py      Settings via pydantic-settings
    main.py        FastAPI entry point
  scripts/         Utility scripts (extract_schema, test_bq_connection, etc.)
  tests/
frontend/          Streamlit (MVP) → Next.js (V1+)
data/              Glossary, examples, metadata enrichments (V1+)
docs/              PRD, Tech Spec, phase docs (phase-1 through phase-9)
```

## Development

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # FastAPI on port 8000

# Frontend (separate terminal)
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

## Key Decisions

- **Full terse schema in system prompt** (not RAG) for MVP — Gemini's 1M context fits all tables
- **Google ADK** for agent framework, Gemini via Vertex AI (no free tier rate limits)
- **RAG deferred to V1+** as supplement only (glossary + examples), not for table discovery
- **Validate-before-execute**: Agent always calls `validate_sql` (dry-run) before `execute_sql`
- **Cost guard**: `maximumBytesBilled` set to 50 GB on every query execution
- All scripts run from `backend/` directory with venv activated
- Test script defaults to dry-run mode ($0 BQ cost): `python scripts/test_agent.py`

## Phase Status

- [x] Phase 1, Chunk 1.1: Project scaffolding
- [x] Phase 1, Chunk 1.2: BigQuery connection
- [x] Phase 1, Chunk 1.3: `execute_sql` tool
- [x] Phase 1, Chunk 1.4: Gemini API key + test
- [x] Phase 1, Chunk 1.5: First Google ADK agent
- [x] Phase 1, Chunk 1.6: Streamlit chat UI
- [x] Phase 2: Full schema extraction (101 tables, dynamic loading, 8/8 test queries pass)
- [x] Phase 3: Validation & self-correction (validate_sql, safety module, cost guards, UI updates)
