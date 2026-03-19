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
Streamlit Chat UI  -->  Google ADK Agent (Gemini 2.5 Flash)  -->  BigQuery
                              |
                        Tools: validate_sql, execute_sql, get_sample_data
                              |
                        Full schema (101 tables) in system prompt
```

**Key design choices:**
- **Full schema in context** -- all 101 table schemas (~6.8K tokens) injected into the system prompt. No RAG needed; Gemini's 1M context handles it easily.
- **Validate-before-execute** -- every query is dry-run validated before execution (free, catches errors, estimates cost).
- **Self-correction** -- agent retries up to 3 times on validation failure, using error context to fix SQL.
- **Human-in-the-loop** -- queries scanning >5 GB require user approval before execution.
- **Cost guard** -- `maximumBytesBilled` (500 GB) enforced on every query.

## Tech Stack

| Component | Tool |
|-----------|------|
| Agent Framework | Google ADK |
| LLM | Gemini 2.5 Flash (via Vertex AI) |
| Data Warehouse | Google BigQuery |
| Frontend | Streamlit |
| Backend | Python + FastAPI |

## Setup

### Prerequisites

- Python 3.12+
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
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # port 8000

# Terminal 2: Frontend
cd frontend/streamlit_app
streamlit run app.py                   # port 8501
```

Open http://localhost:8501 and start asking questions.

## Project Structure

```
backend/
  app/
    agent/           Agent definition, prompts, tools
    bigquery/        Client, safety checks, metadata
    schema/          Terse schema formatter
    api/routes/      FastAPI endpoints
  scripts/           extract_schema, test_agent, etc.
frontend/
  streamlit_app/     Streamlit chat UI
data/                Glossary, examples, enrichments (future)
docs/                Phase docs (phase-1 through phase-10)
```

## Safety

- **Read-only**: Only SELECT queries allowed. DML/DDL rejected at the SQL parser level.
- **Dry-run validation**: Every query validated via BigQuery dry-run before execution.
- **Cost limits**: `maximumBytesBilled` enforced on every query (500 GB cap).
- **Approval threshold**: Queries scanning >5 GB require explicit user approval.
- **Row limits**: Results capped at 1000 rows by default.

## Roadmap

- [x] **Phase 1-3**: Core agent with validation, self-correction, and cost guards
- [x] **Phase 4**: Visualization (Plotly charts, agent thinking steps)
- [x] **Phase 5**: Business context (table enrichments, domain rules)
- [x] **Phase 6**: Complex queries (eval harness, 91.4% accuracy)
- [ ] **Phase 7**: Next.js frontend with SSE streaming, premium design
- [ ] **Phase 8**: Multi-turn conversations
- [ ] **Phase 9**: Multi-agent (LangGraph), auth, Cloud Run deployment
- [ ] **Phase 10**: Model routing (optional — Gemini Flash + Claude Sonnet/Opus)

## License

Private project.
