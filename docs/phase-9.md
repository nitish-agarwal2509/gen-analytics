# Phase 9: Multi-Agent + MySQL Persistence

## Goal
Replace single agent with multi-agent orchestration using ADK sub-agents. Move from in-memory/SQLite to MySQL for sessions, saved queries, and audit logging. Add session persistence across browser refreshes.

## What Shipped

### Multi-Agent Architecture
```
Root Orchestrator (LlmAgent)
├── schema_explorer (LlmAgent) — metadata questions, no SQL
├── sql_specialist (LlmAgent) — writes SQL, validates, self-corrects
└── viz_recommender (LlmAgent) — picks chart type
```

- Root orchestrator routes questions to the right sub-agent via `transfer_to_agent`
- `sql_specialist` writes SQL, calls `validate_sql`, self-corrects up to 3x, transfers back
- Root calls `execute_sql` itself (keeps human-in-the-loop at top level)
- Root transfers to `viz_recommender` after execution
- Each sub-agent has a focused system prompt

### MySQL Persistence
- Local MySQL via Homebrew (`brew services start mysql`), Docker compose also provided
- ADK sessions persisted via `DatabaseSessionService` with `session_service_uri`
- Saved queries migrated from raw SQLite to async SQLAlchemy
- Audit log: every `execute_sql` call logged via `after_tool_callback`
- `GET /api/v1/audit-log` endpoint for query history

### Frontend Session Persistence
- `sessionId` stored in `localStorage` — survives browser refreshes
- Session validated on init (404 → create new)
- Clear Session removes from localStorage

## Key Files
- `backend/app/agent/agent.py` — multi-agent tree
- `backend/app/agent/prompts.py` — per-agent prompts
- `backend/app/agent/callbacks.py` — audit logging callback
- `backend/app/db/database.py` — async SQLAlchemy engine
- `backend/app/db/models.py` — SavedQuery + AuditLog models
- `backend/app/api/routes/audit.py` — audit log endpoint
- `backend/app/main.py` — session_service_uri + lifespan DB init
- `docker-compose.yml` — MySQL 8.0 container (optional)

## What Was Tried but Changed
- **SequentialAgent + LoopAgent**: SequentialAgent doesn't transfer back to parent. LoopAgent runs all iterations even after success. Simplified to flat sub-agents.
- **Separate sql_generator + sql_validator**: sql_generator (no tools) wouldn't call `transfer_to_agent`. Combined into `sql_specialist`.
