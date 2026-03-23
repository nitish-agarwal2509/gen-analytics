# GenAnalytics

Natural language analytics for BigQuery. Ask questions in plain English, get SQL + results + charts.

## What It Does

GenAnalytics is an AI-powered data analyst that translates natural language questions into BigQuery SQL, executes them, and presents results with visualizations. It's built for teams where business users need data answers without writing SQL.

**Example:**
```
User: "What was the total payout amount last month?"

Agent: validates SQL (dry-run) -> estimates scan: 450 MB ($0.003) -> executes -> returns results
       "Total payouts last month: 12,345 transactions worth INR 4.2 Cr"
```

## Architecture

```
React Chat UI  --SSE-->  ADK SSE Server (Google ADK)  -->  Gemini 2.5 Flash  -->  BigQuery
                              |                                    |
                        Root Orchestrator              MySQL (sessions, audit, saved queries)
                         ├── schema_explorer
                         ├── sql_specialist (validate + self-correct)
                         └── viz_recommender
                              |
                        Full schema (51 tables across 10 datasets) in system prompt
```

**Key design choices:**
- **Multi-agent orchestration** -- root orchestrator routes to specialized sub-agents (schema_explorer, sql_specialist, viz_recommender) via ADK `transfer_to_agent`.
- **Full schema in context** -- all 51 table schemas (~10.9K tokens) across 10 datasets injected into sub-agent prompts. No RAG needed; Gemini's 1M context handles it easily.
- **Validate-before-execute** -- every query is dry-run validated before execution (free, catches errors, estimates cost).
- **Self-correction** -- sql_specialist retries up to 3 times on validation failure, using error context to fix SQL.
- **Human-in-the-loop** -- queries scanning >500 GB require user approval before execution.
- **Cost guard** -- `maximumBytesBilled` (500 GB) enforced on every query.
- **Audit logging** -- every query logged to MySQL via ADK `after_tool_callback`.

## Tech Stack

| Component | Tool |
|-----------|------|
| Agent Framework | Google ADK (multi-agent with sub-agents) |
| LLM | Gemini 2.5 Flash (via Vertex AI) |
| Data Warehouse | Google BigQuery |
| Database | MySQL 8.0 (sessions, saved queries, audit log) |
| Frontend | Vite + React + shadcn/ui + Tailwind CSS |
| Backend | Google ADK SSE Server (FastAPI) |
| E2E Tests | Playwright |

## Setup

### Prerequisites

- Python 3.12+
- MySQL 8.0 (via Homebrew: `brew install mysql && brew services start mysql`)
- GCP project with BigQuery access
- Service account key with BigQuery Data Viewer + Job User roles
- Vertex AI API enabled

### Installation

```bash
# Clone
git clone https://github.com/nitish-agarwal2509/gen-analytics.git
cd gen-analytics

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Configure environment
cp .env.example .env
# Edit .env: set GOOGLE_APPLICATION_CREDENTIALS, GCP_PROJECT_ID, etc.

# Extract schema metadata (run once, or when tables change)
python scripts/extract_schema.py <dataset1> <dataset2> ...
```

### Running

```bash
# MySQL (first time: create database)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gen_analytics"

# Terminal 1: Backend (ADK SSE server)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # port 8000

# Terminal 2: Frontend (React)
cd frontend/react-app
npm install                            # first time only
npm run dev                            # port 5173
```

Open http://localhost:5173 and start asking questions.

**Streamlit (legacy MVP)** is still available at `frontend/streamlit_app/` if needed.

## Project Structure

```
backend/
  app/
    agent/           Multi-agent system (orchestrator + sub-agents), prompts, tools, callbacks
    bigquery/        Client, safety checks, metadata
    schema/          Terse schema formatter
    db/              SQLAlchemy async (MySQL/SQLite) — models, engine
    api/routes/      Custom endpoints (saved_queries, audit_log)
    config.py        Settings via pydantic-settings
    main.py          ADK SSE server entry point
  agents/
    gen_analytics/   ADK-compatible agent wrapper
  scripts/           extract_schema, test_agent, evaluate, etc.
frontend/
  react-app/         Vite + React + TypeScript + shadcn/ui (production)
    e2e/             Playwright end-to-end tests
  streamlit_app/     Streamlit chat UI (legacy MVP)
data/                Table enrichments metadata
docs/                Phase docs (phase-1 through phase-10)
docker-compose.yml   MySQL 8.0 container (optional, Homebrew also supported)
```

## Safety

- **Read-only**: Only SELECT queries allowed. DML/DDL rejected at the SQL parser level.
- **Dry-run validation**: Every query validated via BigQuery dry-run before execution.
- **Cost limits**: `maximumBytesBilled` enforced on every query (500 GB cap).
- **Approval threshold**: Queries scanning >500 GB require explicit user approval.
- **Row limits**: Results capped at 1000 rows by default.

## Roadmap

- [x] **Phase 1-3**: Core agent with validation, self-correction, and cost guards
- [x] **Phase 4**: Visualization (Plotly charts, agent thinking steps)
- [x] **Phase 5**: Business context (table enrichments, domain rules)
- [x] **Phase 6**: Complex queries (eval harness, 91.4% accuracy)
- [x] **Phase 7**: React frontend (ADK SSE, Vite + React + shadcn/ui, dark mode, saved queries, Playwright tests)
- [x] **Phase 8**: Multi-turn conversations (ADK sessions, pronoun resolution, clear session reset)
- [x] **Phase 9**: Multi-agent + MySQL (ADK sub-agents, MySQL persistence, audit logging)
- [ ] **Phase 10**: Production deployment (auth, Cloud SQL, Cloud Run, monitoring)

## License

Private project.
