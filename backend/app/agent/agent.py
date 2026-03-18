"""GenAnalytics agent -- translates natural language to SQL and executes it."""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from app.agent.context_loader import load_full_context
from app.agent.prompts import build_system_prompt
from app.agent.tools.execute_sql import execute_sql
from app.agent.tools.get_sample_data import get_sample_data
from app.agent.tools.suggest_viz import suggest_visualization
from app.agent.tools.validate_sql import validate_sql


def create_agent() -> LlmAgent:
    """Create and return the GenAnalytics ADK agent."""
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
