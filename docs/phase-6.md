# Phase 6: Complex Query Handling (Weeks 7-8)

**Milestone**: Agent handles retention, week-on-week, funnels, cohort analysis. 70%+ success on complex test suite.

**Learning Focus**: SQL recipe templates, window functions, CTE patterns, evaluation-driven improvement

**Outcome**: Eval harness showed 91.4% overall accuracy (93% simple, 90% medium, 90% complex) — far exceeding all targets. Recipes, strategy hints, and additional tools were intentionally skipped to avoid the Phase 5 lesson (more prompt = worse results).

---

## Chunk 6.1: SQL Recipe Templates — SKIPPED

**Reason**: Agent already handles WoW, retention, top-N, and trend queries at 90% accuracy without recipe templates. Adding recipes to the prompt risks degrading performance (Phase 5 lesson: glossary/examples caused overthinking). Can revisit if accuracy drops after future changes.

---

## Chunk 6.2: Complex Query Prompt Strategy — SKIPPED

**Reason**: Same as 6.1. The agent reasons well from enriched schema + 3 domain rules alone. Strategy hints would add prompt bulk without measurable benefit.

---

## Chunk 6.3: `get_table_stats` Tool — SKIPPED

**Reason**: 90% complex query accuracy shows the agent doesn't need pre-query stats to pick the right approach. Can revisit if real-world usage reveals edge cases where the agent needs data profiling before writing SQL.

---

## Chunk 6.4: Evaluation Harness ✅

**Goal**: Automated test suite to measure agent accuracy across simple, medium, and complex queries.

**What shipped**:
1. Test case files:
   - `backend/tests/eval/simple_queries.yaml` — 15 cases
   - `backend/tests/eval/medium_queries.yaml` — 10 cases
   - `backend/tests/eval/complex_queries.yaml` — 10 cases
2. `backend/scripts/evaluate.py`:
   - Runs agent in dry-run mode (validate only, $0 BQ cost)
   - Checks each case against expected tables and SQL patterns
   - Supports `--category`, `-n`, `--save` flags
   - Outputs per-category scorecard + failure analysis
   - Saves results to `backend/tests/eval/results/` as JSONL

**Baseline results (2026-03-19)**:
```
simple  : 14/15 ( 93.3%)
medium  :  9/10 ( 90.0%)
complex :  9/10 ( 90.0%)
OVERALL : 32/35 ( 91.4%)
```

3 failures — all minor pattern mismatches, not wrong answers.

---

## Chunk 6.5: Iterative Prompt Tuning — SKIPPED

**Reason**: Only 3 failures out of 35, all debatable (e.g. SUM vs COUNT for "volume"). No systematic failure category worth tuning for. The eval harness exists as a regression safety net for future prompt changes.

---

## Chunk 6.6: Error Logging & Analysis — DEFERRED to Phase 10

**Reason**: Production concern, not needed for current development. The eval harness JSONL output serves as a lightweight substitute for now.

---

## Definition of Done for Phase 6

- [x] Evaluation harness runs 35 test cases across 3 complexity levels
- [x] Accuracy exceeds all targets: 93% simple (target 90%), 90% medium (target 75%), 90% complex (target 55%)
- [x] Agent handles WoW, retention, trend, top-N, cross-domain joins without recipe templates
- [ ] ~~SQL recipe templates~~ — skipped (agent performs well without them)
- [ ] ~~get_table_stats tool~~ — skipped (not needed at current accuracy)
- [ ] ~~Error logging~~ — deferred to Phase 10

**Lesson learned**: Evaluate before building. The eval harness proved the agent already exceeded targets, saving effort on 4 chunks that would have added complexity without measurable benefit.
