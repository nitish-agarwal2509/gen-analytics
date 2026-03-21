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

from contextlib import asynccontextmanager

from google.adk.cli.fast_api import get_fast_api_app

from app.api.routes.audit import router as audit_router
from app.api.routes.saved_queries import router as saved_router
from app.config import settings
from app.db.database import init_db


@asynccontextmanager
async def lifespan(_app):
    """Initialize app DB tables on startup."""
    await init_db()
    yield


# ADK built-in SSE server: /run_sse, /apps/.../sessions, /health, etc.
agents_dir = os.path.join(os.path.dirname(__file__), "..", "agents")
session_kwargs = {}
if settings.mysql_url:
    session_kwargs["session_service_uri"] = settings.mysql_url

app = get_fast_api_app(
    agents_dir=agents_dir,
    web=False,
    allow_origins=["http://localhost:5173"],
    lifespan=lifespan,
    **session_kwargs,
)

# Custom endpoints
app.include_router(saved_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
