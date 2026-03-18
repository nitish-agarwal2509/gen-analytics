# Phase 10: Multi-Agent & Production (Weeks 14-17)

**Milestone**: LangGraph multi-agent system, auth, audit logging, Cloud Run deployment

**Learning Focus**: Multi-agent coordination, state management, production deployment, monitoring

---

## Chunk 10.1: LangGraph Setup

**Goal**: Set up LangGraph and understand the graph abstraction.

**Steps**:
1. Install `langgraph`
2. Write `backend/app/agent/langgraph/state.py`:
   ```python
   class QueryState(TypedDict):
       user_question: str
       conversation_history: list
       complexity: str
       relevant_tables: list
       table_schemas: dict
       generated_sql: str
       validation_result: dict
       query_results: dict
       visualization: dict
       retry_count: int
       error_history: list
   ```
3. Create a simple 2-node graph (just to learn the API): input -> process -> output

**Test**: Simple graph executes and passes state between nodes

---

## Chunk 10.2: Specialized Agents

**Goal**: Split the single agent into specialized agents.

**Steps**:
1. Write `backend/app/agent/langgraph/agents/planner.py`:
   - Receives question + context
   - Classifies complexity, creates execution plan
   - Decides which tables to investigate

2. Write `backend/app/agent/langgraph/agents/schema_agent.py`:
   - Receives planner output
   - Calls `search_tables`, `get_schema`
   - Resolves join paths between tables

3. Write `backend/app/agent/langgraph/agents/sql_agent.py`:
   - Receives schema context
   - Generates SQL (model varies by complexity)

4. Write `backend/app/agent/langgraph/agents/validator.py`:
   - Receives SQL
   - Calls `validate_sql`, handles self-correction
   - Routes back to sql_agent on failure (conditional edge)

5. Write `backend/app/agent/langgraph/agents/viz_agent.py`:
   - Receives query results
   - Determines visualization, formats response

**Test**: Each agent works independently with mock inputs

---

## Chunk 10.3: LangGraph State Graph

**Goal**: Wire agents together as a LangGraph graph.

**Steps**:
1. Write `backend/app/agent/langgraph/graph.py`:
   ```python
   graph = StateGraph(QueryState)
   graph.add_node("planner", planner_agent)
   graph.add_node("schema", schema_agent)
   graph.add_node("sql", sql_agent)
   graph.add_node("validator", validator_agent)
   graph.add_node("viz", viz_agent)

   graph.add_edge("planner", "schema")
   graph.add_edge("schema", "sql")
   graph.add_edge("sql", "validator")
   graph.add_conditional_edges("validator", route_after_validation,
       {"valid": "viz", "invalid": "sql", "give_up": END})
   graph.add_edge("viz", END)
   ```
2. Replace single agent with multi-agent graph
3. Compare accuracy: single-agent vs multi-agent

**Test**: Full query flows through all agents correctly. Multi-agent matches or exceeds single-agent accuracy.

---

## Chunk 10.4: User Authentication

**Goal**: Add Google OAuth 2.0 login.

**Steps**:
1. Set up OAuth 2.0 client in GCP Console
2. Add auth middleware to FastAPI
3. JWT token management for sessions
4. Associate queries with authenticated users
5. Update Next.js with login/logout flow

**Test**: Login with Google account -> access granted. No login -> redirected to login page.

---

## Chunk 10.5: Audit Logging

**Goal**: Log every query for security and analytics.

**Steps**:
1. Create audit log table (SQLite for MVP, BigQuery or Cloud SQL for production):
   ```
   audit_log: {
     id, user_email, timestamp, question, generated_sql,
     tables_accessed, model_used, bytes_scanned, execution_time,
     success, error_message, cost_usd
   }
   ```
2. Write audit log entry on every query execution
3. Admin view to browse audit log

**Test**: Every query creates an audit log entry with complete metadata

---

## Chunk 10.6: Cloud Run Deployment

**Goal**: Deploy to GCP Cloud Run.

**Steps**:
1. Write `backend/Dockerfile` for FastAPI + agent
2. Write `frontend/nextjs_app/Dockerfile` for Next.js
3. Write `docker-compose.yml` for local testing
4. Configure Cloud Run services:
   - Backend service (port 8000)
   - Frontend service (port 3000)
5. Set up environment variables via Secret Manager
6. Configure custom domain (optional)
7. Set up auto-scaling rules

**Test**: Application accessible via Cloud Run URL, all features work

---

## Chunk 10.7: Monitoring & Alerting

**Goal**: Production observability.

**Steps**:
1. Structured logging (JSON format) for Cloud Logging
2. Key metrics to track:
   - Query success rate
   - Average latency by model
   - LLM cost per day
   - BigQuery cost per day
   - Error rate by type
3. Alerting: Email if error rate > 20% or daily cost > threshold
4. Health check endpoint: `GET /health`

**Test**: Logs appear in Cloud Logging, health check returns 200

---

## Chunk 10.8: Performance Optimization

**Goal**: Optimize for production load.

**Steps**:
1. Add semantic query cache (if same intent, return cached result)
2. Cache schema metadata in-memory (refresh hourly)
3. Connection pooling for BigQuery client
4. Migrate ChromaDB to pgvector/AlloyDB if needed for concurrent access
5. Load test: simulate 10 concurrent users

**Test**: 10 concurrent queries don't cause errors or excessive latency

---

## Definition of Done for Phase 10

- [ ] LangGraph multi-agent graph works end-to-end
- [ ] Multi-agent accuracy matches or exceeds single-agent
- [ ] Google OAuth authentication working
- [ ] Audit logging captures every query
- [ ] Deployed on Cloud Run (backend + frontend)
- [ ] Monitoring and alerting set up
- [ ] Semantic query cache reduces redundant LLM calls
- [ ] System handles 10 concurrent users
