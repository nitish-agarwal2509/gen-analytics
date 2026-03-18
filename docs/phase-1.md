# Phase 1: Hello World Agent (Week 1)

**Milestone**: Ask a natural language question, get a SQL answer from BigQuery

**Learning Focus**: Google ADK basics, the agent loop (reason-act-observe), Gemini free tier API, Streamlit

**NOT in Phase 1**: Validation, cost guards, self-correction, multi-turn, visualization -- those come later

---

## Chunk 1.1: Project Scaffolding

**Goal**: Set up the project structure and install all dependencies.

**Steps**:
1. Create directory structure:
   ```
   gen-analytics/
     backend/
       app/
         __init__.py
         main.py
         config.py
         agent/
           __init__.py
         bigquery/
           __init__.py
       pyproject.toml
       .env.example
     frontend/
       streamlit_app/
         app.py
     docs/
   ```
2. Create `pyproject.toml` with dependencies:
   - `google-adk` (Agent Development Kit)
   - `google-cloud-bigquery` (BigQuery client)
   - `fastapi` + `uvicorn` (API server)
   - `streamlit` (frontend)
   - `python-dotenv` (env vars)
   - `pydantic-settings` (config)
3. Create `.env.example` with placeholder variables:
   ```
   GOOGLE_API_KEY=your-gemini-api-key
   GCP_PROJECT_ID=your-project-id
   BQ_DATASET=your-dataset
   ```
4. Set up virtual environment and install dependencies

**Test**: `python -c "import google.adk; import google.cloud.bigquery; import fastapi; import streamlit; print('All imports OK')"`

---

## Chunk 1.2: BigQuery Connection

**Goal**: Connect to BigQuery and verify you can query data.

**Steps**:
1. Set up GCP service account with BigQuery Data Viewer + Job User roles
2. Download service account key JSON (or use application default credentials)
3. Write `backend/app/bigquery/client.py`:
   - Initialize BigQuery client
   - Function `list_datasets()` -> returns list of dataset names
   - Function `list_tables(dataset)` -> returns list of table names
4. Write a test script `backend/scripts/test_bq_connection.py` that calls both functions

**Test**: Run script -> prints your BigQuery datasets and tables

---

## Chunk 1.3: First Tool -- `execute_sql`

**Goal**: Build the `execute_sql` function that runs SQL against BigQuery.

**Steps**:
1. Write `backend/app/agent/tools/execute_sql.py`:
   ```python
   def execute_sql(sql: str, max_rows: int = 100) -> dict:
       # 1. Safety check: reject DML (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER)
       # 2. Execute query
       # 3. Return {columns: [...], rows: [...], total_rows: int, bytes_processed: int}
   ```
2. DML detection: simple regex check on SQL string before execution
3. Error handling: catch BigQuery exceptions, return structured error
4. No cost guard yet (deferred to Phase 3)

**Test**:
- `execute_sql("SELECT 1 as test")` -> `{columns: [{name: "test"}], rows: [{test: 1}]}`
- `execute_sql("DROP TABLE foo")` -> raises error "DML not allowed"
- `execute_sql("SELECT * FROM nonexistent_table")` -> returns structured error

---

## Chunk 1.4: Google AI Studio API Key + Gemini Test

**Goal**: Get a free Gemini API key and verify LLM calls work.

**Steps**:
1. Go to https://aistudio.google.com/ and get a free API key
2. Add `GOOGLE_API_KEY` to your `.env` file
3. Write `backend/scripts/test_gemini.py`:
   ```python
   # Call Gemini 2.5 Flash with a simple prompt
   # "What is 2 + 2?"
   # Verify you get a response
   ```
4. Test with a SQL-related prompt: "Write a BigQuery SQL query to count all rows in a table called `orders`"

**Test**: Script prints Gemini's response to both prompts

---

## Chunk 1.5: First Google ADK Agent

**Goal**: Create a minimal agent that generates SQL and executes it.

**Steps**:
1. Write `backend/app/agent/agent.py`:
   - Define agent using Google ADK
   - System prompt includes hardcoded schema for 1-2 of your real BigQuery tables
   - Register `execute_sql` as a tool
   - Agent receives a natural language question, generates SQL, calls the tool
2. Write `backend/scripts/test_agent.py`:
   - Create the agent
   - Send it a question like "How many rows are in the orders table?"
   - Print the agent's response (SQL + result)

**Test**: Ask 3 simple questions -> at least 2 return correct SQL results

---

## Chunk 1.6: Streamlit Chat UI

**Goal**: Build a basic chat interface that connects to the agent.

**Steps**:
1. Write `frontend/streamlit_app/app.py`:
   ```python
   import streamlit as st

   st.title("GenAnalytics")

   # Initialize chat history in session state
   if "messages" not in st.session_state:
       st.session_state.messages = []

   # Display chat history
   for msg in st.session_state.messages:
       with st.chat_message(msg["role"]):
           st.write(msg["content"])

   # Chat input
   if prompt := st.chat_input("Ask a question about your data..."):
       # Add user message
       st.session_state.messages.append({"role": "user", "content": prompt})

       # Call agent (directly for MVP, later via FastAPI)
       response = call_agent(prompt)

       # Display SQL and results
       st.session_state.messages.append({"role": "assistant", "content": response})
   ```
2. For MVP, import the agent directly (not via FastAPI yet -- simplest path)
3. Display the generated SQL in an expandable section
4. Display results as a Streamlit dataframe

**Test**:
1. Run `streamlit run frontend/streamlit_app/app.py`
2. Open http://localhost:8501
3. Type "How many rows are in [your_table]?"
4. See SQL and results in the chat

---

## Definition of Done for Phase 1

- [x] Project structure created with all dependencies installed
- [x] BigQuery connection works, can list datasets/tables
- [x] `execute_sql` tool works with DML rejection
- [x] Gemini 2.5 Flash responds to prompts via free API key
- [x] Google ADK agent generates SQL from natural language and executes it
- [x] Streamlit chat UI displays questions, SQL, and results
- [x] At least 3 out of 5 simple questions return correct results
