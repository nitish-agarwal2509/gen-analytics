"""GenAnalytics -- Streamlit chat UI for natural language BigQuery analytics."""

import asyncio
import sys
import os

# Add backend to path for direct agent import (MVP -- no FastAPI layer yet)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"))

import streamlit as st
from google.genai import types
from google.adk import Runner
from google.adk.sessions import InMemorySessionService

from app.agent.agent import create_agent

st.set_page_config(page_title="GenAnalytics", page_icon="📊", layout="wide")
st.title("📊 GenAnalytics")
st.caption("Ask questions about your data in plain English")


@st.cache_resource
def get_runner():
    """Create agent and runner once, cached across reruns."""
    agent = create_agent()
    session_service = InMemorySessionService()
    runner = Runner(
        app_name="gen_analytics",
        agent=agent,
        session_service=session_service,
    )
    return runner, session_service


async def create_session(session_service):
    """Create a new ADK session."""
    session = await session_service.create_session(
        app_name="gen_analytics", user_id="streamlit_user"
    )
    return session.id


async def run_agent(runner, session_id: str, question: str) -> dict:
    """Run the agent and collect SQL + results + final answer."""
    message = types.Content(
        role="user", parts=[types.Part(text=question)]
    )

    sql_queries = []
    query_results = []
    final_text = ""

    async for event in runner.run_async(
        user_id="streamlit_user",
        session_id=session_id,
        new_message=message,
    ):
        if not event.content or not event.content.parts:
            continue

        for part in event.content.parts:
            if part.function_call:
                fc = part.function_call
                if fc.args and "sql" in fc.args:
                    sql_queries.append(fc.args["sql"])

            if part.function_response:
                fr = part.function_response
                resp = fr.response
                if isinstance(resp, dict):
                    query_results.append(resp)

            if part.text:
                final_text = part.text

    return {
        "sql": sql_queries,
        "results": query_results,
        "answer": final_text,
    }


# Initialize state
runner, session_service = get_runner()

if "session_id" not in st.session_state:
    st.session_state.session_id = asyncio.run(create_session(session_service))

if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg["role"] == "assistant":
            # Show SQL in expandable section
            if msg.get("sql"):
                for sql in msg["sql"]:
                    with st.expander("🔍 SQL Query"):
                        st.code(sql, language="sql")
            # Show results as table
            if msg.get("results"):
                for result in msg["results"]:
                    if "rows" in result and result["rows"]:
                        st.dataframe(result["rows"], use_container_width=True)
                    if "total_rows" in result:
                        st.caption(f"Total rows: {result['total_rows']:,} | Bytes processed: {result.get('bytes_processed', 0):,}")
                    if "error" in result:
                        st.error(result["error"])
            # Show answer
            st.markdown(msg["answer"])
        else:
            st.markdown(msg["content"])

# Chat input
if prompt := st.chat_input("Ask a question about your data..."):
    # Display user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Run agent
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                response = asyncio.run(
                    run_agent(runner, st.session_state.session_id, prompt)
                )

                # Show SQL
                for sql in response["sql"]:
                    with st.expander("🔍 SQL Query"):
                        st.code(sql, language="sql")

                # Show results
                for result in response["results"]:
                    if "rows" in result and result["rows"]:
                        st.dataframe(result["rows"], use_container_width=True)
                    if "total_rows" in result:
                        st.caption(f"Total rows: {result['total_rows']:,} | Bytes processed: {result.get('bytes_processed', 0):,}")
                    if "error" in result:
                        st.error(result["error"])

                # Show answer
                st.markdown(response["answer"])

                # Save to history
                st.session_state.messages.append({
                    "role": "assistant",
                    "sql": response["sql"],
                    "results": response["results"],
                    "answer": response["answer"],
                })

            except Exception as e:
                error_msg = str(e)
                if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                    st.error("⚠️ Gemini free tier rate limit reached. Please wait a minute and try again.")
                else:
                    st.error(f"Error: {error_msg}")
