# Phase 5: Visualization & Polish (Weeks 5-6)

**Milestone**: MVP demo -- ask questions, get charts, see SQL, working multi-turn

**Learning Focus**: End-to-end integration, visualization decisions, result presentation

---

## Chunk 5.1: `suggest_viz` Tool

**Goal**: Agent recommends the right chart type based on result shape.

**Steps**:
1. Write `backend/app/agent/tools/suggest_viz.py`:
   ```python
   def suggest_visualization(columns: list, row_count: int, query_intent: str) -> dict:
       # Rules:
       # - 1 row, 1 numeric column -> metric card
       # - 1 categorical + 1 numeric -> bar chart
       # - 1 date/time + 1 numeric -> line chart
       # - 2+ numeric columns -> scatter or table
       # - Many rows, many columns -> table
       # Return {chart_type, x_axis, y_axis, title, color_by}
   ```
2. Start with rule-based heuristics, can add LLM suggestion later

**Test**:
- Single revenue number -> metric card
- Category + value -> bar chart
- Date + value -> line chart

---

## Chunk 5.2: Plotly Chart Rendering in Streamlit

**Goal**: Render charts based on `suggest_viz` recommendations.

**Steps**:
1. Write `frontend/streamlit_app/components/chart_renderer.py`:
   - `render_chart(chart_config, data)` dispatches to the right Plotly chart
   - Support: metric card (`st.metric`), bar chart, line chart, table (`st.dataframe`)
2. Integrate into chat messages -- after results, show the chart

**Test**: Each chart type renders correctly with sample data

---

## Chunk 5.3: SQL Display with Syntax Highlighting

**Goal**: Show generated SQL in a readable, highlighted format.

**Steps**:
1. Use Streamlit's `st.code(sql, language="sql")` for syntax highlighting
2. Wrap in `st.expander("View SQL")` so it's collapsible
3. Show metadata alongside: tables used, estimated scan size, execution time

**Test**: SQL displays with proper highlighting and is collapsible

---

## Chunk 5.4: Agent Thinking Steps Display

**Goal**: Show the user what the agent is doing at each step.

**Steps**:
1. Capture agent tool calls: "Searching for tables...", "Found: orders, customers", "Generating SQL...", "Validating (est. 450MB)...", "Executing..."
2. Display as a progress indicator or expandable "thinking" section
3. On self-correction: "Validation error. Retrying (attempt 2/3)..."

**Test**: Ask a question -> see step-by-step progress as agent works

---

## Chunk 5.5: Expand to More Tables

**Goal**: Ingest more tables to test the system with a larger schema.

**Steps**:
1. Expand metadata ingestion from 10-20 to 30-50 tables
2. Re-run `ingest_metadata.py`
3. Test that `search_tables` still finds the right tables with more candidates
4. Identify any accuracy degradation and note for Phase 6

**Test**: 8 out of 10 test questions find correct tables from the expanded set

---

## Chunk 5.6: Session History Panel

**Goal**: Show a sidebar with previous queries in the current session.

**Steps**:
1. Add Streamlit sidebar with session history:
   ```python
   with st.sidebar:
       st.header("Query History")
       for i, turn in enumerate(conversation.turns):
           if turn.role == "user":
               if st.button(turn.content[:50], key=f"hist_{i}"):
                   # Re-run this query
   ```
2. Clicking a history item shows the results again (from memory, no re-execution)

**Test**: Ask 3 questions -> all appear in sidebar -> clicking shows the result

---

## Chunk 5.7: MVP Demo Prep

**Goal**: Prepare a polished demo flow.

**Steps**:
1. Prepare 5-7 demo questions that showcase:
   - Simple metric lookup
   - Multi-table query
   - Self-correction (intentionally tricky question)
   - Multi-turn follow-up
   - Schema exploration
2. Test each demo question end-to-end
3. Fix any rough edges in the UI
4. Document known limitations

**Test**: Full demo flow works without errors for all prepared questions

---

## Definition of Done for Phase 5 (MVP Complete)

- [ ] Charts render for different result shapes (metric, bar, line, table)
- [ ] SQL displayed with syntax highlighting, collapsible
- [ ] Agent thinking steps visible to user
- [ ] 30-50 tables ingested in ChromaDB
- [ ] Session history in sidebar
- [ ] Demo flow of 5-7 questions works end-to-end
- [ ] Multi-turn context works across demo questions
- [ ] Self-correction works for at least 1 demo question
