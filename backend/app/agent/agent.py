"""GenAnalytics agent -- multi-agent architecture for natural language to SQL."""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from app.agent.context_loader import load_full_context
from app.agent.prompts import (
    build_system_prompt,
    build_orchestrator_prompt,
    build_schema_explorer_prompt,
    build_sql_specialist_prompt,
    build_viz_recommender_prompt,
)
from app.agent.callbacks import audit_after_tool
from app.agent.tools.execute_sql import execute_sql
from app.agent.tools.get_sample_data import get_sample_data
from app.agent.tools.suggest_viz import suggest_visualization
from app.agent.tools.validate_sql import validate_sql


def create_agent() -> LlmAgent:
    """Create the multi-agent GenAnalytics system.

    Architecture:
        Root Orchestrator (LlmAgent)
        ├── schema_explorer (LlmAgent) — metadata questions, no SQL
        ├── sql_specialist (LlmAgent) — writes, validates, self-corrects SQL
        └── viz_recommender (LlmAgent) — picks chart type

    Flow for data questions:
        Root → sql_specialist (writes + validates SQL) → Root (executes SQL)
             → viz_recommender → Root (summarizes results)
    """
    context = load_full_context()
    schema = context["schema"]

    schema_explorer = LlmAgent(
        name="schema_explorer",
        model="gemini-2.5-flash",
        description="Answers questions about available tables, columns, and schema metadata without running SQL.",
        instruction=build_schema_explorer_prompt(schema),
    )

    sql_specialist = LlmAgent(
        name="sql_specialist",
        model="gemini-2.5-flash",
        description=(
            "Writes BigQuery SQL, validates via dry-run, and self-corrects errors. "
            "Transfer here for any question that requires querying data."
        ),
        instruction=build_sql_specialist_prompt(schema),
        tools=[
            FunctionTool(validate_sql),
            FunctionTool(get_sample_data),
        ],
    )

    viz_recommender = LlmAgent(
        name="viz_recommender",
        model="gemini-2.5-flash",
        description="Recommends the best chart type based on query result columns and row count.",
        instruction=build_viz_recommender_prompt(),
        tools=[
            FunctionTool(suggest_visualization),
        ],
    )

    root = LlmAgent(
        name="gen_analytics",
        model="gemini-2.5-flash",
        description="Root orchestrator for GenAnalytics.",
        instruction=build_orchestrator_prompt,
        tools=[
            FunctionTool(execute_sql),
        ],
        sub_agents=[schema_explorer, sql_specialist, viz_recommender],
        after_tool_callback=audit_after_tool,
    )

    return root


def create_single_agent() -> LlmAgent:
    """Create the original single-agent (for eval harness backward compatibility)."""
    context = load_full_context()
    prompt = build_system_prompt(terse_schema=context["schema"])
    return LlmAgent(
        name="gen_analytics",
        model="gemini-2.5-flash",
        instruction=prompt,
        tools=[
            FunctionTool(validate_sql),
            FunctionTool(execute_sql),
            FunctionTool(get_sample_data),
            FunctionTool(suggest_visualization),
        ],
    )
