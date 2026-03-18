# Phase 6: Complex Query Handling (Weeks 7-8)

**Milestone**: Agent handles retention, week-on-week, funnels, cohort analysis. 70%+ success on complex test suite.

**Learning Focus**: SQL recipe templates, window functions, CTE patterns, evaluation-driven improvement

---

## Chunk 6.1: SQL Recipe Templates

**Goal**: Create a library of reusable SQL pattern templates for complex analytics.

**Steps**:
1. Create `data/examples/sql_recipes.yaml`:
   ```yaml
   week_on_week_comparison:
     description: "Compare a metric between current week and previous week"
     pattern: |
       WITH current_week AS (
         SELECT {metric} as value FROM {table}
         WHERE {date_col} >= DATE_TRUNC(CURRENT_DATE(), WEEK)
       ),
       previous_week AS (
         SELECT {metric} as value FROM {table}
         WHERE {date_col} >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK), INTERVAL 7 DAY)
           AND {date_col} < DATE_TRUNC(CURRENT_DATE(), WEEK)
       )
       SELECT current_week.value as this_week, previous_week.value as last_week,
         ROUND((current_week.value - previous_week.value) / previous_week.value * 100, 2) as pct_change
       FROM current_week, previous_week

   retention_cohort:
     description: "User retention by signup cohort"
     pattern: |
       WITH cohorts AS (
         SELECT {user_id}, DATE_TRUNC({signup_date}, {period}) as cohort
         FROM {user_table}
       ),
       activity AS (
         SELECT {user_id}, DATE_TRUNC({activity_date}, {period}) as activity_period
         FROM {activity_table}
       )
       SELECT cohort, activity_period,
         DATE_DIFF(activity_period, cohort, {period}) as periods_since_signup,
         COUNT(DISTINCT a.{user_id}) as active_users
       FROM cohorts c JOIN activity a USING ({user_id})
       GROUP BY 1, 2, 3 ORDER BY 1, 3
   ```
2. Include 10-15 recipes: WoW/MoM comparison, retention cohort, funnel analysis, moving average, top-N per group, cumulative sum, percentile, pivot
3. Write `backend/app/schema/recipes.py` -- loader + formatter
4. Update `backend/app/agent/prompts.py` -- add `{recipes}` section
5. Update `backend/app/agent/context_loader.py` -- load recipes into context

**Test**: "Week on week payout count" -> agent uses WoW pattern. "User retention by month" -> agent uses retention pattern.

---

## Chunk 6.2: Complex Query Prompt Strategy

**Goal**: Improve agent instructions for handling multi-step analytical questions.

**Steps**:
1. Update `backend/app/agent/prompts.py` -- add COMPLEX QUERY STRATEGIES section:
   ```
   COMPLEX QUERY STRATEGIES:
   - For "week on week" or "month on month": Use CTEs to compute both periods, then compare
   - For "retention": Define cohorts by first activity date, then join with subsequent activity
   - For "funnel": Use conditional aggregation or sequential CTEs for each funnel step
   - For "trend": Use DATE_TRUNC to group by period, ORDER BY date ascending
   - For "top N per group": Use ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) then filter
   - When the question is ambiguous about time period, default to last 30 days
   - When the question involves "users", use sm_user_id unless context suggests upi_user_id
   - Break complex questions into steps: identify the metric, the grouping, the time range, and any filters
   ```

**Test**: Ask complex questions without explicit SQL guidance, verify agent follows the strategies.

---

## Chunk 6.3: `get_table_stats` Tool

**Goal**: New tool that returns quick summary statistics to help the agent understand data before writing complex queries.

**Steps**:
1. Write `backend/app/agent/tools/get_table_stats.py`:
   ```python
   def get_table_stats(table_name: str, column_name: str = None) -> dict:
       # No column: returns row count, min/max of date columns (time range)
       # With column: returns distinct count, min, max, null count, sample values
       # Uses APPROX_COUNT_DISTINCT for efficiency
       # Cost guard: always uses LIMIT and maximumBytesBilled
   ```
2. Register as `FunctionTool` in `backend/app/agent/agent.py`
3. Add prompt instruction: "For complex queries, consider calling get_table_stats first to understand date ranges and available values"

**Test**: Agent calls `get_table_stats` when building a retention query to discover the date range.

---

## Chunk 6.4: Evaluation Harness

**Goal**: Automated test suite to measure agent accuracy across simple, medium, and complex queries.

**Steps**:
1. Create test case files:
   - `backend/tests/eval/simple_queries.yaml` (15+ cases)
   - `backend/tests/eval/medium_queries.yaml` (10+ cases)
   - `backend/tests/eval/complex_queries.yaml` (10+ cases: retention, WoW, funnel, etc.)
2. Write `backend/scripts/evaluate.py`:
   - Load test cases from YAML
   - For each: run agent, check validation success, check expected tables appear in SQL, check SQL pattern match
   - Supports `--dry-run` mode (validate only, no execute) for $0 cost
   - Output: per-category accuracy, overall accuracy, failure details
   - Results saved to `backend/tests/eval/results/` with timestamp

**Test**: Evaluation runs. Baseline target: 80%+ simple, 60%+ medium, 40%+ complex.

---

## Chunk 6.5: Iterative Prompt Tuning Based on Eval

**Goal**: Use evaluation results to identify failure patterns and systematically improve.

**Process** (iterative, 2-3 rounds):
1. Run evaluation harness
2. Analyze failures -- categorize as: wrong table, wrong column, wrong aggregation, wrong time filter, syntax error, missing domain knowledge
3. Fix per category:
   - Wrong table -> update table enrichment in `data/metadata/table_enrichments.yaml`
   - Wrong column -> add column notes to enrichments
   - Wrong aggregation -> add example to `data/examples/query_examples.yaml`
   - Wrong time filter -> add domain rule to prompts
   - Missing domain knowledge -> add glossary term
   - Complex pattern failure -> add/refine recipe in `data/examples/sql_recipes.yaml`
4. Re-run evaluation, measure improvement

**Target after tuning**: 90%+ simple, 75%+ medium, 55%+ complex.

---

## Chunk 6.6: Error Logging & Analysis

**Goal**: Structured logging of agent failures for ongoing improvement.

**Steps**:
1. Write `backend/app/agent/error_tracker.py`:
   - `log_query_attempt(question, sql, validation_result, execution_result, retries) -> dict`
   - Categorizes errors: syntax, wrong_table, wrong_column, timeout, cost_exceeded, unknown
   - Writes to `backend/logs/query_attempts.jsonl` (append-only JSONL)
2. Update `frontend/streamlit_app/app.py` -- call error tracker after each agent run
3. Write `backend/scripts/analyze_errors.py` -- reads JSONL log, outputs error category distribution

**Test**: Run 10 queries (mix of easy and hard), verify all logged. Run analysis script, see meaningful breakdown.

---

## Definition of Done for Phase 6

- [ ] 10-15 SQL recipe templates for complex patterns (WoW, retention, funnel, etc.)
- [ ] Agent handles week-on-week, retention, funnel, top-N questions
- [ ] `get_table_stats` tool helps agent understand data before complex queries
- [ ] Evaluation harness runs 35+ test cases across 3 complexity levels
- [ ] Error logging and analysis pipeline works
- [ ] Accuracy targets met after iterative tuning (90%+ simple, 75%+ medium, 55%+ complex)
