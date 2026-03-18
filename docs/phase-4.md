# Phase 4: Visualization & Polish (Week 4)

**Milestone**: Charts render for different result shapes, polished SQL display, agent thinking steps visible

**Learning Focus**: Chart selection heuristics, Plotly integration, Streamlit UX patterns

---

## Chunk 4.1: `suggest_viz` Tool

**Goal**: Rule-based tool that recommends a chart type based on result shape.

**Steps**:
1. Write `backend/app/agent/tools/suggest_viz.py`:
   ```python
   def suggest_visualization(columns: list[dict], row_count: int, query_intent: str) -> dict:
       # Rules:
       # - 1 row, 1 numeric column -> metric card
       # - 1 categorical + 1 numeric -> bar chart
       # - 1 date/time + 1 numeric -> line chart
       # - 2+ numeric columns -> scatter or table
       # - Many rows, many columns -> table
       # Return {chart_type, x_axis, y_axis, title, color_by}
   ```
2. Register as `FunctionTool` in `backend/app/agent/agent.py`
3. Add prompt instruction: after getting results, call `suggest_visualization` with column metadata

**Test**:
- Single revenue number -> metric card
- Category + value -> bar chart
- Date + value -> line chart

---

## Chunk 4.2: Plotly Chart Rendering in Streamlit

**Goal**: Render charts based on `suggest_viz` recommendations.

**Steps**:
1. Write `frontend/streamlit_app/components/chart_renderer.py`:
   - `render_chart(chart_config, data)` dispatches to the right Plotly chart
   - Support: metric card (`st.metric`), bar chart, line chart, table (`st.dataframe`)
2. Update `frontend/streamlit_app/app.py`:
   - Capture `suggest_visualization` function response from agent events
   - Call `render_chart()` in `_render_assistant_message()` if viz config exists

**Test**: Each chart type renders correctly with real agent responses

---

## Chunk 4.3: SQL Display Enhancement

**Goal**: Show generated SQL with metadata in a readable, highlighted format.

**Steps**:
1. Update `frontend/streamlit_app/app.py` -- `_render_assistant_message()`:
   - SQL already shows in `st.expander` with `st.code()`. Enhance to also show:
     - Estimated scan size and cost (from validation)
     - Execution time (add timing to `run_agent`)
     - Tool call sequence: e.g., "validate_sql -> execute_sql -> suggest_visualization"

**Test**: SQL expander shows metadata alongside syntax-highlighted SQL

---

## Chunk 4.4: Agent Thinking Steps Display

**Goal**: Show real-time progress as the agent works through its tool calls.

**Steps**:
1. Update `frontend/streamlit_app/app.py`:
   - Replace `st.spinner("Thinking...")` with `st.status()` (expandable status container)
   - Map tool calls to human-readable labels:
     - `validate_sql` -> "Validating SQL..."
     - `execute_sql` -> "Executing query..."
     - `suggest_visualization` -> "Choosing visualization..."
     - `get_sample_data` -> "Inspecting table data..."
   - Update status container as events stream in
   - Show validation results (pass/fail), retry count, and final status

**Test**: Ask a question -> see step-by-step progress. Trigger self-correction -> see retry steps.

---

## Chunk 4.5: Session History Sidebar

**Goal**: Sidebar showing past queries in the current session.

**Steps**:
1. Update `frontend/streamlit_app/app.py`:
   - Add `st.sidebar` section with session history
   - Show truncated question (first 60 chars) for each past query
   - Add "Clear Session" button that resets messages and creates a new ADK session

**Test**: Ask 3 questions -> all appear in sidebar. Click "Clear Session" -> history resets.

---

## Chunk 4.6: Demo Prep and Polish

**Goal**: End-to-end demo with curated questions, example suggestions in UI.

**Steps**:
1. Create `docs/demo_questions.md` with 5-7 curated demo questions
2. Update `frontend/streamlit_app/app.py`:
   - Add clickable example questions below chat input using `st.columns` + `st.button`
   - Questions showcase: simple metric, filtered query, aggregation, schema exploration
3. Test all demo questions end-to-end
4. Fix any rough edges in the UI

**Test**: All demo questions produce correct SQL, charts render, thinking steps display

---

## Definition of Done for Phase 4

- [ ] `suggest_viz` tool recommends correct chart type (metric, bar, line, table)
- [ ] Plotly charts render in Streamlit for each chart type
- [ ] SQL display includes metadata (scan size, cost, execution time)
- [ ] Agent thinking steps visible as tool calls stream
- [ ] Session history sidebar with clear button
- [ ] 5-7 demo questions work end-to-end with charts
