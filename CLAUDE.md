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
docs/              PRD, Tech Spec, phase docs (phase-1 through phase-10)
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
- [ ] Phase 7: Next.js Frontend (SSE streaming, React UI, premium design, saved queries)
- [ ] Phase 8: Multi-Turn Conversations (conversation history, pronoun resolution, follow-ups)
- [ ] Phase 9: Multi-Agent & Production (LangGraph, auth, audit, Cloud Run)
- [ ] Phase 10: Model Routing & Paid Models (optional — complexity classifier, Claude via Vertex AI, escalation)
