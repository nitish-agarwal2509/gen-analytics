import os

from dotenv import load_dotenv

# Load .env before any other app imports
load_dotenv()

# Resolve relative GOOGLE_APPLICATION_CREDENTIALS to backend dir
if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and not os.path.isabs(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
        os.path.dirname(__file__), "..", os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    )

from google.adk.cli.fast_api import get_fast_api_app

from app.api.routes.saved_queries import router as saved_router

# ADK built-in SSE server: /run_sse, /apps/.../sessions, /health, etc.
agents_dir = os.path.join(os.path.dirname(__file__), "..", "agents")
app = get_fast_api_app(
    agents_dir=agents_dir,
    web=False,
    allow_origins=["http://localhost:5173"],
)

# Custom endpoints
app.include_router(saved_router, prefix="/api/v1")
