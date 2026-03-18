# Phase 5: Business & Domain Context (Week 5-6)

**Milestone**: Agent understands domain-specific terminology and produces better SQL for business questions

**Learning Focus**: Prompt engineering with domain knowledge, YAML-driven configuration, schema enrichment

**Key Design Decision**: Terse schema is ~6.8K tokens. Glossary + examples + enrichments add ~5-10K tokens. Total ~15-20K -- trivially fits in Gemini's 1M context. No ChromaDB/RAG needed; everything is injected directly into the system prompt.

---

## Chunk 5.1: Table Enrichments

**Goal**: Add human-authored descriptions and business context to tables, merge into terse schema output.

**Steps**:
1. Create `data/metadata/table_enrichments.yaml`:
   ```yaml
   rewards_prod.payouts_v3:
     description: "Payout disbursements to users (cashback, rewards)"
     business_context: "Primary table for payout/cashback reporting"
     important_columns:
       status: "INITIATED, SUCCESS, FAILED, REVERSED"
       amount: "Amount in paisa (divide by 100 for INR)"
   ```
2. Start with 20-30 most queried tables
3. Write `backend/app/schema/enrichments.py` -- YAML loader
4. Update `backend/app/schema/formatter.py` -- `format_terse_schema(metadata, enrichments=None)`
   - Append description after table line: `rewards_prod.payouts_v3 (~32M rows) [Payout disbursements]: col1(TYPE)...`
   - Append column notes: `amount(INT)[paisa/100=INR]`
5. Update `backend/app/agent/agent.py` -- load enrichments and pass to formatter

**Test**: Run `format_terse_schema` with enrichments, verify descriptions appear in output. Measure token delta.

---

## Chunk 5.2: Business Glossary

**Goal**: Map domain terms (retention, GMV, MAU, churn, etc.) to SQL patterns and table references.

**Steps**:
1. Create `data/glossary/business_terms.yaml`:
   ```yaml
   retention:
     definition: "Users who performed activity in consecutive time periods"
     sql_hint: "Use DATE_TRUNC + COUNT(DISTINCT user_id) grouped by cohort period"
     related_tables: ["rewards_prod.wallet_transaction_v3", "upi_prod.transaction_v3"]
     synonyms: ["retained users", "repeat users"]

   GMV:
     definition: "Gross Merchandise Value - total transaction value before discounts"
     sql_hint: "SUM(amount) from transaction tables. Amount is typically in paisa."
     related_tables: ["upi_prod.transaction_v3"]
   ```
2. Write `backend/app/schema/glossary.py`:
   - `load_glossary(path) -> list[dict]`
   - `format_glossary_for_prompt(glossary) -> str`
3. Update `backend/app/agent/prompts.py` -- add `{glossary}` placeholder between rules and schema
4. Update `backend/app/agent/agent.py` -- load glossary, format, pass to prompt builder

**Test**: Ask "What is the GMV this month?" -- agent uses the glossary hint to correctly SUM(amount) from transaction tables.

---

## Chunk 5.3: Few-Shot SQL Examples

**Goal**: Provide curated question-to-SQL examples directly in the system prompt as few-shot learning.

**Steps**:
1. Create `data/examples/query_examples.yaml`:
   ```yaml
   - question: "Total payouts last month"
     sql: |
       SELECT COUNT(*) as total_payouts, SUM(amount)/100 as total_amount_inr
       FROM rewards_prod.payouts_v3
       WHERE TIMESTAMP_MILLIS(created_at) >= TIMESTAMP_TRUNC(TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MONTH), MONTH)
         AND TIMESTAMP_MILLIS(created_at) < TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), MONTH)
     explanation: "Note: created_at is epoch millis, amount is paisa"
     complexity: "LOW"

   - question: "Daily active UPI users this week"
     sql: |
       SELECT DATE(TIMESTAMP_MILLIS(created_at)) as day, COUNT(DISTINCT upi_user_id) as dau
       FROM upi_prod.transaction_v3
       WHERE TIMESTAMP_MILLIS(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       GROUP BY day ORDER BY day
     complexity: "MEDIUM"
   ```
2. Curate 15-20 examples spanning LOW, MEDIUM, HIGH complexity
3. Write `backend/app/schema/examples.py` -- loader + formatter
4. Update `backend/app/agent/prompts.py` -- add `{examples}` placeholder
5. Update `backend/app/agent/agent.py` -- load and inject examples

**Test**: Queries similar to examples get better first-attempt accuracy. Measure total prompt token count.

---

## Chunk 5.4: Domain-Specific Prompt Rules

**Goal**: Add domain-specific rules and conventions beyond the glossary.

**Steps**:
1. Update `backend/app/agent/prompts.py` -- expand the Rules section:
   - Amount fields are in paisa (divide by 100 for INR)
   - Status fields use uppercase values: SUCCESS, FAILED, INITIATED, REVERSED
   - For daily metrics use `DATE(TIMESTAMP_MILLIS(created_at))`
   - Default time range when unspecified: last 30 days
   - User identifier guidance: sm_user_id for cross-product, upi_user_id for UPI-specific
   - Exclude test data: `sm_user_id NOT LIKE 'test%'`

**Test**: Ask domain-specific questions that require paisa conversion and epoch millis handling. Verify agent applies rules without explicit instruction.

---

## Chunk 5.5: Unified Context Loader

**Goal**: Single entry point that assembles schema + enrichments + glossary + examples with token budget monitoring.

**Steps**:
1. Write `backend/app/agent/context_loader.py`:
   ```python
   def load_full_context() -> dict:
       # Loads and assembles all context pieces:
       # - Terse schema with enrichments
       # - Glossary
       # - Few-shot examples
       # Returns {"schema": str, "glossary": str, "examples": str, "total_tokens": int}
   ```
   - Token budget check: warn if total exceeds 50K tokens
   - Log token counts for each section
2. Update `backend/app/agent/agent.py` -- use `load_full_context()` instead of `_load_terse_schema()`
3. Write `backend/scripts/measure_prompt.py` -- script that prints token breakdown by section

**Test**: Run `measure_prompt.py`, verify all sections load, total tokens < 25K.

---

## Definition of Done for Phase 5

- [x] 20-30 tables have enriched descriptions in terse schema
- [x] 20-30 business glossary terms in system prompt
- [x] 15-20 few-shot SQL examples in system prompt
- [x] Domain-specific rules cover paisa/epoch/status patterns
- [x] Unified context loader with token budget monitoring
- [ ] Agent handles domain-specific questions better than before enrichments
