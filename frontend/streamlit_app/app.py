"""GenAnalytics -- Streamlit chat UI for natural language BigQuery analytics."""

import asyncio
import sys
import os
import time

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
from components.chart_renderer import render_chart
from components.styles import inject_custom_css

# ---- Page config ----
st.set_page_config(page_title="GenAnalytics", page_icon="📊", layout="wide")

inject_custom_css()

# ---- Header ----
st.markdown("""
<div class="app-header">
    <h1>GenAnalytics</h1>
    <p>Ask questions about your data in plain English</p>
</div>
""", unsafe_allow_html=True)


# ---- Agent setup ----
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


_TOOL_LABELS = {
    "validate_sql": "Validating SQL...",
    "execute_sql": "Executing query...",
    "suggest_visualization": "Choosing visualization...",
    "get_sample_data": "Inspecting table data...",
}


async def run_agent(runner, session_id: str, question: str, status=None) -> dict:
    """Run the agent and collect SQL + results + final answer."""
    message = types.Content(
        role="user", parts=[types.Part(text=question)]
    )

    sql_queries = []
    query_results = []
    validations = []
    viz_config = None
    tool_calls = []
    final_text = ""
    start_time = time.time()

    if status:
        status.update(label="Thinking...", state="running")
        status.write("Analyzing your question...")

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
                label = _TOOL_LABELS.get(fc.name, f"Calling {fc.name}...")
                if status:
                    status.update(label=label)
                    status.write(f"Step {len(tool_calls)}: {label}")
                if fc.name == "validate_sql" and fc.args and "sql" in fc.args:
                    sql_queries.append(fc.args["sql"])
                elif fc.name == "execute_sql" and fc.args and "sql" in fc.args:
                    if not sql_queries or sql_queries[-1] != fc.args["sql"]:
                        sql_queries.append(fc.args["sql"])

            if part.function_response:
                fr = part.function_response
                resp = fr.response
                if isinstance(resp, dict):
                    if fr.name == "validate_sql":
                        validations.append(resp)
                        if status:
                            if resp.get("is_valid"):
                                status.write(f"  ✅ SQL valid (scan: {_fmt_bytes(resp.get('estimated_bytes', 0))})")
                            else:
                                errors = resp.get("errors", ["Unknown error"])
                                status.write(f"  ❌ Validation failed: {errors[0][:80]}")
                    elif fr.name == "execute_sql":
                        query_results.append(resp)
                    elif fr.name == "suggest_visualization":
                        viz_config = resp

            if part.text:
                final_text = part.text

    elapsed = time.time() - start_time

    if status:
        status.update(label=f"Done ({elapsed:.1f}s)", state="complete")

    return {
        "sql": sql_queries,
        "results": query_results,
        "validations": validations,
        "viz_config": viz_config,
        "tool_calls": tool_calls,
        "elapsed_seconds": round(elapsed, 1),
        "answer": final_text,
    }


# ---- Rendering ----
def _render_assistant_message(msg):
    """Render an assistant message with validation, SQL, results, and answer."""
    validations = msg.get("validations", [])

    # Self-correction expander
    if len(validations) > 1:
        with st.expander(f"🔄 Self-correction ({len(validations)} attempts)"):
            for i, v in enumerate(validations):
                if v.get("is_valid"):
                    st.success(f"Attempt {i+1}: Valid (scan: {_fmt_bytes(v.get('estimated_bytes', 0))})")
                else:
                    st.error(f"Attempt {i+1}: {', '.join(v.get('errors', ['Unknown error']))}")

    # Validation badge
    if len(validations) == 1 and validations[0].get("is_valid"):
        v = validations[0]
        est = _fmt_bytes(v.get("estimated_bytes", 0))
        cost = v.get("estimated_cost_usd", 0)
        if v.get("requires_approval"):
            st.markdown(
                f'<div class="validation-badge expensive">⚠️ Expensive query &middot; Scan: {est} &middot; Est. cost: ${cost:.6f} &middot; Approval requested</div>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                f'<div class="validation-badge valid">✓ Validated &middot; Scan: {est} &middot; Est. cost: ${cost:.6f}</div>',
                unsafe_allow_html=True,
            )

    # SQL expander with metadata
    if msg.get("sql"):
        with st.expander("SQL Query", icon="🔍"):
            st.code(msg["sql"][-1], language="sql")
            # Build metadata HTML
            meta_html_parts = []
            for v in reversed(validations):
                if v.get("is_valid"):
                    meta_html_parts.append(f'<span class="meta-item"><span class="meta-label">Scan:</span>{_fmt_bytes(v.get("estimated_bytes", 0))}</span>')
                    cost = v.get("estimated_cost_usd", 0)
                    if cost:
                        meta_html_parts.append(f'<span class="meta-item"><span class="meta-label">Cost:</span>${cost:.6f}</span>')
                    break
            if msg.get("elapsed_seconds"):
                meta_html_parts.append(f'<span class="meta-item"><span class="meta-label">Time:</span>{msg["elapsed_seconds"]}s</span>')
            if msg.get("tool_calls"):
                tools = " → ".join(msg["tool_calls"])
                meta_html_parts.append(f'<span class="meta-item"><span class="meta-label">Tools:</span>{tools}</span>')
            if meta_html_parts:
                st.markdown(f'<div class="meta-row">{"".join(meta_html_parts)}</div>', unsafe_allow_html=True)

    # Chart
    viz_config = msg.get("viz_config")
    if viz_config and viz_config.get("chart_type") != "table":
        render_chart(viz_config, msg.get("results", []))

    # Results table
    if msg.get("results"):
        for result in msg["results"]:
            if "rows" in result and result["rows"]:
                if not viz_config or viz_config.get("chart_type") != "metric_card":
                    st.dataframe(result["rows"], use_container_width=True)
            if "total_rows" in result:
                st.caption(f"Total rows: {result['total_rows']:,} | Bytes processed: {_fmt_bytes(result.get('bytes_processed', 0))}")
            if "error" in result:
                st.error(result["error"])

    # Answer
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


# ---- Initialize state ----
runner, session_service = get_runner()

if "session_id" not in st.session_state:
    st.session_state.session_id = asyncio.run(create_session(session_service))

if "messages" not in st.session_state:
    st.session_state.messages = []


# ---- Sidebar ----
with st.sidebar:
    st.markdown("## Session History")
    user_questions = [m["content"] for m in st.session_state.messages if m["role"] == "user"]
    if user_questions:
        for i, q in enumerate(user_questions, 1):
            truncated = q[:55] + "..." if len(q) > 55 else q
            st.markdown(
                f'<div class="sidebar-query-item"><span class="sidebar-query-num">{i}.</span>{truncated}</div>',
                unsafe_allow_html=True,
            )
    else:
        st.caption("No queries yet. Ask a question to get started.")
    st.markdown("<div style='height: 1rem'></div>", unsafe_allow_html=True)
    if st.button("🗑  Clear Session", use_container_width=True):
        st.session_state.messages = []
        st.session_state.session_id = asyncio.run(create_session(session_service))
        st.rerun()


# ---- Example questions ----
_EXAMPLE_QUESTIONS = [
    "What was the total payout amount last month?",
    "How many successful payouts in the last 7 days?",
    "Show payouts by status for the last 30 days",
    "Show daily payout count for the last 2 weeks",
    "Top 10 reward events by count last month",
]


# ---- Chat history ----
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg["role"] == "assistant":
            _render_assistant_message(msg)
        else:
            st.markdown(msg["content"])

# ---- Welcome state with pill buttons ----
if not st.session_state.messages:
    st.markdown("""
    <div class="welcome-container">
        <h3>What would you like to know?</h3>
        <p>Ask any question about your data, or try one of these examples:</p>
    </div>
    """, unsafe_allow_html=True)

    # Render pills as real buttons (2 rows)
    row1 = st.columns(3)
    row2 = st.columns(3)
    all_cols = row1 + row2
    for i, q in enumerate(_EXAMPLE_QUESTIONS):
        if i < len(all_cols):
            with all_cols[i]:
                if st.button(q, key=f"example_{i}", use_container_width=True):
                    st.session_state["_pending_question"] = q
                    st.rerun()


# ---- Chat input ----
prompt = st.chat_input("Ask a question about your data...")
if not prompt and st.session_state.get("_pending_question"):
    prompt = st.session_state.pop("_pending_question")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        try:
            with st.status("Thinking...", expanded=True) as status:
                response = asyncio.run(
                    run_agent(runner, st.session_state.session_id, prompt, status=status)
                )

            _render_assistant_message(response)

            st.session_state.messages.append({
                "role": "assistant",
                "sql": response["sql"],
                "results": response["results"],
                "validations": response.get("validations", []),
                "viz_config": response.get("viz_config"),
                "tool_calls": response.get("tool_calls", []),
                "elapsed_seconds": response.get("elapsed_seconds"),
                "answer": response["answer"],
            })

        except Exception as e:
            error_msg = str(e)
            if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                st.error("⚠️ Gemini rate limit reached. Please wait a minute and try again.")
            else:
                st.error(f"Error: {error_msg}")
