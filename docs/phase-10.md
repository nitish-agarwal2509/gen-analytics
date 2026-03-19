# Phase 10: Model Routing & Paid Models (Optional — Weeks 16-17)

**Milestone**: Smart routing between models, 85%+ success, Claude for complex queries

**Learning Focus**: Model routing patterns, cost optimization, Vertex AI integration

**Note**: This phase is optional. Gemini 2.5 Flash already achieves 91.4% accuracy. Implement only if real-world usage reveals accuracy gaps on complex queries that warrant model escalation.

---

## Chunk 10.1: Vertex AI Setup for Claude

**Goal**: Access Claude Sonnet/Opus via Vertex AI Model Garden.

**Steps**:
1. Enable Vertex AI API in your GCP project
2. Request access to Claude models via Model Garden (if not already available)
3. Write `backend/app/agent/llm_clients.py`:
   - `call_gemini_flash(prompt, tools)` (existing, via Vertex AI)
   - `call_claude_sonnet(prompt, tools)` (new, via Vertex AI)
   - `call_claude_opus(prompt, tools)` (new, via Vertex AI)
4. Verify each model responds correctly

**Test**: Each model generates SQL for a test question

---

## Chunk 10.2: Complexity Classifier

**Goal**: Classify query complexity to route to the right model.

**Steps**:
1. Write `backend/app/agent/complexity.py`:
   ```python
   def classify_complexity(question: str, conversation_context: str = "") -> str:
       # Rule-based first:
       # - Simple keywords (count, total, how many) + no joins -> LOW
       # - Comparison, by X, trend -> MEDIUM
       # - Cohort, funnel, correlation, predict, anomaly -> HIGH
       #
       # Fallback to Gemini Flash for ambiguous cases:
       # "Rate this question's SQL complexity: LOW, MEDIUM, or HIGH"
       return "LOW" | "MEDIUM" | "HIGH"
   ```
2. Start with rules, add LLM fallback for edge cases

**Test**:
- "Total revenue" -> LOW
- "Revenue by product by quarter" -> MEDIUM
- "Cohort retention funnel" -> HIGH

---

## Chunk 10.3: Model Router

**Goal**: Route queries to the appropriate model based on complexity.

**Steps**:
1. Write `backend/app/agent/model_router.py`:
   ```python
   def route_to_model(complexity: str) -> str:
       routing = {
           "LOW": "gemini-flash",
           "MEDIUM": "claude-sonnet",
           "HIGH": "claude-opus"
       }
       return routing[complexity]
   ```
2. Integrate into agent: classify -> route -> generate SQL with selected model
3. Log which model was used for each query

**Test**: Different complexity questions route to different models (verify via logs)

---

## Chunk 10.4: Model Escalation

**Goal**: If a query fails on a cheaper model, automatically escalate.

**Steps**:
1. Add escalation logic:
   - If query fails on Gemini Flash after 2 retries -> escalate to Claude Sonnet
   - If query fails on Claude Sonnet after 2 retries -> escalate to Claude Opus
   - Claude Opus is the ceiling -- 3 retries then give up
2. Track escalation events for cost analysis

**Test**: Simple query that fails on Flash -> automatically succeeds on Sonnet

---

## Chunk 10.5: `explain_query` Tool

**Goal**: Agent can explain what the SQL does in plain language.

**Steps**:
1. Write `backend/app/agent/tools/explain_query.py`:
   ```python
   def explain_query(sql: str, context: str) -> dict:
       # Call LLM: "Explain this SQL in simple terms. What does it do?"
       # Return {explanation: str, key_assumptions: list[str]}
   ```
2. Show explanation alongside results in UI
3. Include assumptions made (e.g., "I interpreted 'revenue' as net revenue")

**Test**: Complex SQL gets a clear, accurate explanation

---

## Chunk 10.6: Feedback Mechanism

**Goal**: Users can rate responses for future improvement.

**Steps**:
1. Add thumbs up/down buttons to each agent response
2. Store feedback: `{query_id, question, sql, rating, comment, model_used, timestamp}`
3. Store in SQLite for MVP (file-based, no extra infra)
4. Write a script to analyze feedback: accuracy by model, common failure patterns

**Test**: Click thumbs up/down -> feedback stored in SQLite -> analysis script works

---

## Chunk 10.7: Cost Tracking Dashboard

**Goal**: Track LLM and BigQuery costs per query.

**Steps**:
1. Log per query: model used, input/output tokens, BigQuery bytes scanned
2. Calculate estimated cost per query
3. Add a "Cost" section to sidebar:
   - Total cost this session
   - Average cost per query
   - Cost by model tier
4. Alert if any single query exceeds $0.50

**Test**: Ask 10 questions -> sidebar shows accurate cost breakdown

---

## Definition of Done for Phase 10

- [ ] Claude Sonnet and Opus accessible via Vertex AI
- [ ] Complexity classifier routes LOW/MEDIUM/HIGH correctly
- [ ] Model router sends queries to appropriate model
- [ ] Escalation works: Flash failure -> Sonnet -> Opus
- [ ] `explain_query` provides clear explanations
- [ ] Feedback stored and analyzable
- [ ] Cost tracking in sidebar
- [ ] 85%+ success rate on test suite
