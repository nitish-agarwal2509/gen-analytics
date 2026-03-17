# GenAnalytics: Product Requirements Document

## 1. Problem Statement

Cross-functional teams (business, product, data, engineering) depend on data analysts to write SQL against a 500+ table BigQuery warehouse. This creates bottlenecks -- business users wait days for ad-hoc analyses. The data exists; the barrier is translating human questions into correct SQL.

**Vision**: A natural language analytics tool where any team member asks questions in plain English and gets accurate, visualized answers. It acts as a knowledgeable data analyst who knows every table, understands business terminology, writes correct SQL, and presents results clearly.

**Learning Goal**: This project is equally about building a production-grade agentic AI system and learning the patterns: tool use, self-correction, RAG, model routing, and multi-agent orchestration.

---

## 2. User Personas

| Persona | Role | Technical Depth | Typical Question |
|---------|------|-----------------|------------------|
| **Maya** | VP of Marketing | Can read dashboards, no SQL | "What was our CAC last quarter by channel?" |
| **Raj** | Senior PM, Growth | Basic SQL, understands data models | "Show me signup-to-purchase funnel by cohort week" |
| **Priya** | Analytics Engineer | Expert SQL | "Find all subscription billing tables and their relationships" |
| **Sam** | Engineering Lead | Strong programmer, moderate SQL | "What's p99 latency for checkout API over 7 days?" |

---

## 3. Use Case Taxonomy

| Category | Example | Complexity | SQL Pattern |
|----------|---------|------------|-------------|
| Simple Metric Lookup | "Total revenue last month" | Low | Single aggregate |
| Filtered Metric | "Revenue from enterprise in APAC" | Low-Medium | Aggregate + WHERE + JOIN |
| Comparative Analysis | "Compare Q1 vs Q2 by product" | Medium | GROUP BY + CASE |
| Funnel / Cohort | "Signup to purchase funnel by cohort" | Medium-High | Window functions, CTEs |
| Correlation / Deep Analysis | "Which features predict 90-day retention?" | High | Multi-CTE, statistical |
| Anomaly Detection | "Flag metrics significantly off trend" | High | Time-series, z-scores |
| Schema Exploration | "What tables have subscription data?" | Meta | No SQL executed |
| Predictive | "Projected ARR in 6 months?" | Very High | Extrapolation |

---

## 4. Feature Breakdown by Phase

### MVP (Phase 1) -- minimal cost

**Constraint**: Use free tools where possible. Gemini via Vertex AI (pay-as-go, ~$0.0003/query).

Features are built incrementally across development phases 1-5:

| Feature | Description | Priority |
|---------|-------------|----------|
| Chat Interface | Streamlit chat UI | P0 |
| SQL Generation | Agent generates BigQuery-compatible SQL with full schema visible | P0 |
| SQL Display | Always show generated SQL | P0 |
| Full Schema in Context | Extract all table/column metadata, inject terse schema into system prompt (no RAG) | P1 |
| SQL Validation | Dry-run every query before execution | P2 |
| Cost Guard | `maximumBytesBilled` on every query | P2 |
| Self-Correction Loop | On failure, feed error back for correction (max 3 retries) | P2 |
| Query History + Multi-Turn | In-memory session history doubles as conversation context for follow-up questions | P3 |
| Basic Visualization | Auto-detect result shape -> table, bar chart, or line chart | P4 |

### V1 -- Introduce paid models

| Feature | Description | Priority |
|---------|-------------|----------|
| RAG Supplement | ChromaDB for business glossary, few-shot examples, rich metadata (NOT for table discovery) | P0 |
| Business Glossary | Term -> SQL pattern mapping ("churn" -> specific CTE) via RAG | P0 |
| Few-Shot Examples | Curated query examples via RAG | P0 |
| Model Routing | Simple -> Gemini Flash, moderate -> Claude Sonnet, complex -> Claude Opus (paid) | P1 |
| Rich Visualizations | Heatmaps, scatter, funnels, cohort grids | P1 |
| Query Explanation | NL explanation of SQL logic | P1 |
| Feedback Loop | Thumbs up/down on results | P1 |
| Next.js Frontend | Migrate from Streamlit to production UI | P1 |
| Saved Queries | Persist and search query library | P2 |

### V2 -- Multi-agent + Production

| Feature | Description | Priority |
|---------|-------------|----------|
| Multi-Agent (LangGraph) | Planner, schema, SQL, validator, viz agents | P0 |
| Dashboard Builder | Compose saved queries into dashboards | P1 |
| User Management | Auth, per-user quotas, RLS pass-through | P1 |
| Audit Log | Full query audit trail | P1 |
| Cloud Run Deployment | Production GCP deployment | P1 |
| Anomaly Detection | Automated deviation detection | P2 |
| Scheduled Reports | Cron-based execution + email/Slack delivery | P2 |

---

## 5. UX Flows

### Phase 1 -- Hello World
```
User: "What was total revenue last month?"
System: [hardcoded schema for 1-2 tables -> LLM generates SQL -> executes -> shows results + SQL]
```

### Phase 3 -- With Validation & Self-Correction
```
User: "Conversion funnel by weekly cohort for last 3 months"
System: [full schema in context -> LLM identifies tables -> generates SQL -> dry-run ERROR: column 'signup_date' not found -> feeds error back -> self-corrects to 'created_at' -> validates -> executes -> renders cohort heatmap]
```

### Phase 4 -- Multi-Turn (query history as context)
```
User: "Top 10 customers by LTV"  ->  [table]
  (system stores: question + SQL + results summary in query history)
User: "Show their retention over time"
  (system sends: query history as context + new question to LLM)
  -> [LLM understands "their" = the 10 customers from previous query]
User: "Compare against average"
  (system sends: full query history + new question)
  -> [adds average customer retention line]
```

---

## 6. Success Metrics

| Metric | MVP | V1 | V2 |
|--------|-----|----|----|
| SQL execution success rate | 70% | 85% | 92% |
| Correct table selection | 75% | 90% | 95% |
| Answer correctness | 60% | 80% | 88% |
| Simple query e2e latency | <10s | <10s | <5s |
| Avg LLM cost per query | ~$0.0003 (Vertex AI) | <$0.03 | <$0.02 |
