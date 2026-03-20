"""GenAnalytics -- FastAPI application using ADK built-in SSE.

ADK auto-discovers agents via root_agent exports in agents_dir.
Provides: POST /run_sse, session CRUD, /list-apps.
"""

import logging
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.cli.fast_api import get_fast_api_app

# Load .env before anything else
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

# Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENT_DIR = os.path.join(BASE_DIR, "agents")
BUILD_WEB_PATH = os.path.join(BASE_DIR, "build-web")

# ADK session storage: SQLite for dev (file-based, persists across restarts)
SESSION_DB = os.path.join(BASE_DIR, "data", "sessions.db")
SESSION_SERVICE_URI = f"sqlite:///{SESSION_DB}"

ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "*"]

# ADK creates the FastAPI app with built-in endpoints:
#   POST /run_sse          - SSE streaming
#   POST /apps/{app}/users/{user}/sessions - create session
#   GET  /apps/{app}/users/{user}/sessions/{id} - load session
#   GET  /list-apps        - agent discovery
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOWED_ORIGINS,
    web=False,
)

logger.info(f"Agent directory: {AGENT_DIR}")
logger.info(f"Session DB: {SESSION_DB}")

# Custom routes (alongside ADK)
from app.api.routes.saved_queries import router as saved_queries_router

app.include_router(saved_queries_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gen-analytics"}


# --- Frontend static file serving (production) ---
@app.get("/web")
async def web_ui():
    """Serve the React frontend."""
    index_path = os.path.join(BUILD_WEB_PATH, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built. Run 'npm run build' in frontend/web."}


@app.get("/web/{filepath:path}")
async def web_assets(filepath: str):
    """Serve static assets, SPA fallback to index.html."""
    file_path = os.path.join(BUILD_WEB_PATH, filepath)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA fallback
    index_path = os.path.join(BUILD_WEB_PATH, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built"}


# Mount assets directory if it exists
assets_path = os.path.join(BUILD_WEB_PATH, "assets")
if os.path.exists(assets_path):
    app.mount("/web/assets", StaticFiles(directory=assets_path), name="web-assets")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.WARNING)

    logger.info("Starting GenAnalytics on http://localhost:8000")
    logger.info("ADK endpoints: POST /run_sse, GET /list-apps")
    if os.path.exists(BUILD_WEB_PATH):
        logger.info("Frontend: http://localhost:8000/web")

    uvicorn.run(app, host="0.0.0.0", port=8000)
