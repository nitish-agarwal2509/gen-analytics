"""GenAnalytics agent -- ADK auto-discovery entry point.

ADK scans agents_dir for modules exporting root_agent.
"""

from app.agent.agent import create_agent

root_agent = create_agent()
