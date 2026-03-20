# Phase 3: Validation & Self-Correction (Week 3)

**Milestone**: Agent validates SQL before running and automatically retries on failure

**Learning Focus**: Self-correction as an agentic pattern, BigQuery safety, guardrails

---

## Chunk 3.1: `validate_sql` Tool (Dry-Run)

**Goal**: Validate SQL syntax and estimate cost before execution.

**Steps**:
1. Write `backend/app/agent/tools/validate_sql.py`:
   ```python
   def validate_sql(sql: str) -> dict:
       # 1. DML check (reject non-SELECT)
       # 2. BigQuery dry_run=True
       # 3. Return {is_valid, errors, estimated_bytes, estimated_cost_usd, tables_referenced}
   ```
2. Cost calculation: `estimated_bytes * $6.25 / 1e12`

**Test**:
- Valid SQL -> `{is_valid: true, estimated_bytes: 50000000}`
- Invalid SQL -> `{is_valid: false, errors: ["Column not found"]}`
- DML attempt -> `{is_valid: false, errors: ["DML not allowed"]}`

---

## Chunk 3.2: Safety Module

**Goal**: Centralize all BigQuery safety checks.

**Steps**:
1. Write `backend/app/bigquery/safety.py`:
   - `is_read_only(sql)` -> reject DML/DDL keywords
   - `check_cost_limit(estimated_bytes, max_bytes=500GB)` -> reject expensive queries
   - `has_partition_filter(sql, partition_column)` -> warn if missing
   - `enforce_row_limit(sql, max_rows=1000)` -> add LIMIT if missing

**Test**:
- `is_read_only("SELECT * FROM t")` -> True
- `is_read_only("DROP TABLE t")` -> False
- `check_cost_limit(5e9, max_bytes=10e9)` -> True (under limit)
- `check_cost_limit(15e9, max_bytes=10e9)` -> False (over limit)

---

## Chunk 3.3: Integrate Validation into Agent Flow

**Goal**: Agent ALWAYS validates before executing.

**Steps**:
1. Update agent system prompt:
   ```
   CRITICAL RULE: You MUST call validate_sql before execute_sql. Never execute unvalidated SQL.
   If validation fails, analyze the error and try to fix the SQL.
   ```
2. Update tool registration: agent has `validate_sql`, `execute_sql`, `get_sample_data`, `suggest_visualization`
3. Expected agent flow: generate SQL (full schema in context) -> validate -> execute

**Test**: Observe agent logs -- every execution is preceded by a validation call

---

## Chunk 3.4: Self-Correction Loop

**Goal**: When SQL fails, agent automatically retries with error context.

**Steps**:
1. Update agent prompt with self-correction instructions:
   ```
   If validate_sql returns errors:
   1. Read the error message carefully
   2. Think about what went wrong (wrong column name? wrong table? syntax error?)
   3. If needed, call get_sample_data to verify column values
   4. Generate corrected SQL
   5. Validate again
   Maximum 3 attempts. After 3 failures, explain the issue to the user.
   ```
2. Track retry count in agent state
3. On each retry, include: original question + failed SQL + error message

**Test**:
- Deliberately ask a question that will cause a column name error -> agent retries and corrects
- Ask something impossible (table doesn't exist) -> agent gives up after 3 attempts with explanation
- Count retry attempts -- verify max 3

---

## Chunk 3.5: Error Display in Streamlit

**Goal**: Show validation errors and retry attempts to the user.

**Steps**:
1. Update Streamlit UI to show agent's thinking process:
   - "Searching for relevant tables..."
   - "Generating SQL..."
   - "Validating query... (estimated scan: 450MB)"
   - "Validation error: column 'signup_date' not found. Retrying..."
   - "Query corrected and validated. Executing..."
2. Show final SQL with an expandable "attempts" section showing retry history

**Test**: Ask a question that triggers self-correction -> see retry steps in UI

---

## Chunk 3.6: Human-in-the-Loop for Expensive Queries

**Goal**: Agent asks user for approval before executing queries that scan large amounts of data.

**Learning**: Human-in-the-loop — the agent defers to the user for high-stakes decisions rather than acting autonomously. This is a core agentic pattern alongside tool use and self-correction.

**Steps**:
1. Add `APPROVAL_THRESHOLD_BYTES` (5 GB) to `backend/app/bigquery/safety.py`
2. Update `validate_sql` to return `requires_approval: true` when scan exceeds threshold
3. Update agent prompt: if `requires_approval` is true, ask the user before calling `execute_sql`
4. Update Streamlit UI to show warning for expensive queries

**Flow**:
- Query < 5 GB: auto-execute (no change)
- Query > 5 GB: agent tells user estimated scan/cost, waits for "yes" before executing
- User says "cancel": agent does not execute, shows message

**Test**: Ask "Show total amount from all wallet transactions" (~23 GB) -> agent asks for approval -> user says "yes" -> executes

---

## Definition of Done for Phase 3

- [x] `validate_sql` correctly validates/rejects SQL via BigQuery dry-run
- [x] Safety module catches DML, cost overruns (500 GB limit), with `maximumBytesBilled` enforcement
- [x] Agent always validates before executing (verified: tool sequence is validate_sql -> execute_sql)
- [x] Self-correction instructions in prompt: agent retries up to 3 times on validation failure
- [x] Agent writes correct SQL on first attempt due to full schema context (self-correction is a safety net)
- [x] Streamlit shows validation status, cost estimate, and self-correction attempts
- [x] Test script defaults to dry-run mode ($0 BQ cost)
- [x] Human-in-the-loop: expensive queries (>5 GB) require user approval before execution
