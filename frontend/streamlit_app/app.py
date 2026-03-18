"""GenAnalytics -- Streamlit chat UI for natural language BigQuery analytics."""

import asyncio
import sys
import os

# Add backend to path for direct agent import (MVP -- no FastAPI layer yet)
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Resolve relative GOOGLE_APPLICATION_CREDENTIALS to backend dir
if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and not os.path.isabs(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(BACKEND_DIR, os.environ["GOOGLE_APPLICATION_CREDENTIALS"])

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
    validations = []
    tool_calls = []  # track tool call sequence
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
                tool_calls.append(fc.name)
                if fc.name == "validate_sql" and fc.args and "sql" in fc.args:
                    sql_queries.append(fc.args["sql"])
                elif fc.name == "execute_sql" and fc.args and "sql" in fc.args:
                    # Only add if not already captured from validate_sql
                    if not sql_queries or sql_queries[-1] != fc.args["sql"]:
                        sql_queries.append(fc.args["sql"])

            if part.function_response:
                fr = part.function_response
                resp = fr.response
                if isinstance(resp, dict):
                    if fr.name == "validate_sql":
                        validations.append(resp)
                    elif fr.name == "execute_sql":
                        query_results.append(resp)

            if part.text:
                final_text = part.text

    return {
        "sql": sql_queries,
        "results": query_results,
        "validations": validations,
        "tool_calls": tool_calls,
        "answer": final_text,
    }


def _render_assistant_message(msg):
    """Render an assistant message with validation, SQL, results, and answer."""
    # Show validation attempts if there were retries
    validations = msg.get("validations", [])
    if len(validations) > 1:
        with st.expander(f"🔄 Self-correction ({len(validations)} attempts)"):
            for i, v in enumerate(validations):
                if v.get("is_valid"):
                    st.success(f"Attempt {i+1}: Valid (scan: {_fmt_bytes(v.get('estimated_bytes', 0))})")
                else:
                    st.error(f"Attempt {i+1}: {', '.join(v.get('errors', ['Unknown error']))}")

    # Show validation status for single successful validation
    if len(validations) == 1 and validations[0].get("is_valid"):
        v = validations[0]
        est = _fmt_bytes(v.get("estimated_bytes", 0))
        cost = v.get("estimated_cost_usd", 0)
        if v.get("requires_approval"):
            st.warning(f"⚠️ Expensive query | Scan: {est} | Est. cost: ${cost:.6f} | User approval requested")
        else:
            st.caption(f"✅ Validated | Scan: {est} | Est. cost: ${cost:.6f}")

    # Show SQL
    if msg.get("sql"):
        # Show only the final (successful) SQL
        with st.expander("🔍 SQL Query"):
            st.code(msg["sql"][-1], language="sql")

    # Show results
    if msg.get("results"):
        for result in msg["results"]:
            if "rows" in result and result["rows"]:
                st.dataframe(result["rows"], use_container_width=True)
            if "total_rows" in result:
                st.caption(f"Total rows: {result['total_rows']:,} | Bytes processed: {_fmt_bytes(result.get('bytes_processed', 0))}")
            if "error" in result:
                st.error(result["error"])

    # Show answer
    st.markdown(msg["answer"])


def _fmt_bytes(n: int) -> str:
    """Format byte count to human-readable string."""
    if n >= 1024 ** 3:
        return f"{n / 1024 ** 3:.2f} GB"
    if n >= 1024 ** 2:
        return f"{n / 1024 ** 2:.1f} MB"
    if n >= 1024:
        return f"{n / 1024:.0f} KB"
    return f"{n} B"


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
            _render_assistant_message(msg)
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

                _render_assistant_message(response)

                # Save to history
                st.session_state.messages.append({
                    "role": "assistant",
                    "sql": response["sql"],
                    "results": response["results"],
                    "validations": response.get("validations", []),
                    "answer": response["answer"],
                })

            except Exception as e:
                error_msg = str(e)
                if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                    st.error("⚠️ Gemini free tier rate limit reached. Please wait a minute and try again.")
                else:
                    st.error(f"Error: {error_msg}")
