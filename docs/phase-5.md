# Phase 5: Business & Domain Context (Week 5-6)

**Milestone**: Agent understands domain-specific terminology and produces better SQL for business questions

**Learning Focus**: Prompt engineering with domain knowledge, YAML-driven configuration, schema enrichment

**Key Design Decision**: Terse schema is ~6.8K tokens. Enrichments add ~1K tokens. Total ~7.8K -- trivially fits in Gemini's 1M context. No ChromaDB/RAG needed. Glossary and few-shot examples were tested in the prompt but caused the agent to overthink -- removed and kept as data files for Phase 6 eval only.

---

## Chunk 5.1: Table Enrichments ✅

**Goal**: Add human-authored descriptions and business context to tables, merge into terse schema output.

**What shipped**:
1. Created `data/metadata/table_enrichments.yaml` -- 25 tables with concise descriptions + essential column notes (enum values, unit conventions)
2. `backend/app/schema/enrichments.py` -- YAML loader
3. Updated `backend/app/schema/formatter.py` -- `format_terse_schema(metadata, enrichments=None)` appends `[description]` and `[column notes]` inline
4. `backend/app/agent/context_loader.py` -- loads schema + enrichments, returns assembled context with token counts

---

## Chunk 5.2: Business Glossary (data file only) ✅

**Goal**: Map domain terms (retention, GMV, MAU, churn, etc.) to SQL patterns and table references.

**What shipped**:
1. Created `data/glossary/business_terms.yaml` -- 20 business terms with definitions, SQL hints, related tables
2. **NOT injected into prompt** -- tested and found it caused agent to overthink and pick wrong tables
3. Later deleted -- Phase 6 eval harness uses its own test case YAMLs instead

---

## Chunk 5.3: Few-Shot SQL Examples (data file only) ✅

**Goal**: Provide curated question-to-SQL examples for eval and potential future use.

**What shipped**:
1. Created `data/examples/query_examples.yaml` -- 16 curated question→SQL pairs at LOW/MEDIUM/HIGH complexity
2. **NOT injected into prompt** -- same issue as glossary; agent performed worse with examples in context
3. Later deleted -- Phase 6 eval harness uses its own test case YAMLs instead

---

## Chunk 5.4: Domain-Specific Prompt Rules ✅

**Goal**: Add targeted domain rules that prevent common agent mistakes.

**What shipped**:
- 3 rules added to `backend/app/agent/prompts.py` DOMAIN RULES section:
  1. For transaction_v3: ALWAYS use `transaction_at` for time filtering, NOT `created_at`
  2. ALL timestamps are in IST (Asia/Kolkata), NOT UTC
  3. `upi_user_id` is NOT a unique user identifier -- use `sm_user_id` for counting distinct users

**What was removed**: Originally had 6+ rules (paisa conversion, status values, default time range, test data exclusion). Slimmed to 3 essentials -- the rest are covered by table enrichments column notes.

---

## Chunk 5.5: Unified Context Loader ✅

**Goal**: Single entry point that assembles schema + enrichments with token budget monitoring.

**What shipped**:
1. `backend/app/agent/context_loader.py` -- loads schema metadata + enrichments, returns `{"schema": str, "token_counts": dict, "total_tokens": int}`
2. Updated `backend/app/agent/agent.py` -- uses `load_full_context()` instead of inline schema loading
3. `backend/scripts/measure_prompt.py` -- prints token breakdown by section

---

## Definition of Done for Phase 5

- [x] 25 tables have enriched descriptions + column notes in terse schema
- [x] 3 targeted domain rules in prompt (transaction_at, IST timestamps, sm_user_id)
- [x] Unified context loader with enrichments (~7.8K tokens total)
- [x] ~~Business glossary and few-shot examples as YAML data files~~ — created, tested, removed (unused; eval harness has its own test cases)
- [x] measure_prompt.py script for token breakdown

**Lesson learned**: Glossary and few-shot examples in the system prompt caused the agent to overthink and pick wrong tables. Removed from prompt; the LLM reasons better from enriched schema + minimal rules.
