# Phase 2: Full Schema Extraction (Week 2)

**Milestone**: Agent has all 500+ table schemas in context, finds the right tables automatically (no more hardcoded schemas)

**Learning Focus**: BigQuery metadata APIs, prompt engineering with large context, terse schema formatting

---

## Chunk 2.1: Metadata Extraction Script

**Goal**: Extract table and column metadata from BigQuery.

**Steps**:
1. Write `backend/app/bigquery/metadata.py`:
   - Query `INFORMATION_SCHEMA.TABLES` for table names, row counts, sizes
   - Query `INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` for column names, types, descriptions
   - Return structured metadata for each table
2. Write `backend/scripts/extract_schema.py`:
   - Call metadata extraction for all datasets/tables
   - Output as JSON for inspection
   - Add progress tracking (print progress every 50 tables)

**Test**: Script outputs structured metadata for all tables with column details

---

## Chunk 2.2: Terse Schema Formatter

**Goal**: Convert raw metadata into a compact, token-efficient schema string.

**Steps**:
1. Write `backend/app/schema/formatter.py`:
   ```python
   def format_terse_schema(metadata: list[dict]) -> str:
       # For each table, produce one line:
       # dataset.table_name: col1(TYPE), col2(TYPE), col3(TYPE)
       # Type abbreviations: INT, FLOAT, STR, TS, DATE, BOOL, BYTES, STRUCT, ARRAY
       # Example: analytics.orders: order_id(INT), customer_id(INT), amount(FLOAT), status(STR), created_at(TS)
   ```
2. Optimize for token efficiency:
   - Abbreviate types (STRING -> STR, TIMESTAMP -> TS, INTEGER -> INT)
   - One table per line
   - Omit nullable/mode info (save tokens)
3. Add token counting utility to estimate total tokens

**Test**:
- Format 10 tables -> output is readable and compact
- Estimate tokens for full 500+ table schema (target: ~250K tokens)

---

## Chunk 2.3: Schema Injection into System Prompt

**Goal**: Replace hardcoded schema with full extracted schema in the agent's system prompt.

**Steps**:
1. Write `backend/app/agent/prompts.py`:
   ```python
   def build_system_prompt(terse_schema: str) -> str:
       return f"""You are a data analyst assistant with access to a BigQuery warehouse.
       The FULL SCHEMA of all available tables is provided below.

       1. Understand the user's question
       2. Identify relevant tables from the schema below
       3. Generate BigQuery SQL
       4. Execute using execute_sql tool

       SCHEMA:
       {terse_schema}
       """
   ```
2. Update agent initialization to load schema at startup
3. Cache the terse schema string (regenerate on demand, not every request)

**Test**: Agent system prompt includes full schema. Print token count to verify it fits.

---

## Chunk 2.4: `get_sample_data` Tool

**Goal**: Agent can preview rows from any table to understand data patterns.

**Steps**:
1. Write `backend/app/agent/tools/get_sample_data.py`:
   ```python
   def get_sample_data(table_name: str, limit: int = 5) -> dict:
       # 1. Validate table_name exists
       # 2. SELECT * FROM `table_name` LIMIT {limit}
       # 3. Return {columns: [...], rows: [...]}
   ```
2. Register as agent tool

**Test**: `get_sample_data("analytics.orders")` returns 5 sample rows

---

## Chunk 2.5: Agent with Full Schema Context

**Goal**: Agent uses full schema to answer questions about any table, not just hardcoded ones.

**Steps**:
1. Update `backend/app/agent/agent.py`:
   - Load terse schema at startup via `extract_schema.py` output or cached file
   - Inject into system prompt via `build_system_prompt()`
   - Agent now has visibility into all tables
2. Test with questions spanning different tables/datasets
3. Compare accuracy vs Phase 1 hardcoded schema

**Test**:
- Ask "What are the top 5 products by revenue?" -> agent identifies correct table from full schema, generates correct SQL
- Ask about a table that wasn't in the Phase 1 hardcoded schema -> agent handles it
- At least 6 out of 8 test questions find the correct tables and produce valid SQL

---

## Chunk 2.6: Schema Refresh Mechanism

**Goal**: Ability to refresh the schema when tables change.

**Steps**:
1. Add a script/command to re-extract and re-format the terse schema
2. Save terse schema to a cached file (`data/schema_cache.txt`)
3. Agent loads from cache at startup, script regenerates cache on demand
4. Log schema stats: number of tables, total columns, estimated tokens

**Test**: Run refresh script -> cache file updated -> agent uses new schema on restart

---

## Definition of Done for Phase 2

- [ ] Metadata extracted from all BigQuery tables
- [ ] Terse schema formatter produces compact, token-efficient output
- [ ] Full schema injected into agent system prompt (~250K tokens)
- [ ] `get_sample_data` tool works for any table
- [ ] Agent dynamically discovers tables from full schema (no hardcoded schemas)
- [ ] Schema refresh mechanism works
- [ ] At least 6/8 test questions find correct tables and generate valid SQL
