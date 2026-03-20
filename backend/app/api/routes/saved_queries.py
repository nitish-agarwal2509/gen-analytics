"""Saved queries API -- persist and retrieve user-saved queries."""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/queries/saved", tags=["saved-queries"])

# SQLite DB in backend/data/
_DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "data", "saved_queries.db"
)


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS saved_queries (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            question TEXT NOT NULL,
            sql TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    return conn


class SaveQueryRequest(BaseModel):
    name: str
    description: str = ""
    question: str
    sql: str


class SavedQuery(BaseModel):
    id: str
    name: str
    description: str
    question: str
    sql: str
    created_at: str


@router.post("", response_model=SavedQuery)
def save_query(req: SaveQueryRequest):
    db = _get_db()
    query_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO saved_queries (id, name, description, question, sql, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (query_id, req.name, req.description, req.question, req.sql, now),
    )
    db.commit()
    db.close()
    return SavedQuery(
        id=query_id,
        name=req.name,
        description=req.description,
        question=req.question,
        sql=req.sql,
        created_at=now,
    )


@router.get("", response_model=list[SavedQuery])
def list_saved_queries():
    db = _get_db()
    rows = db.execute("SELECT * FROM saved_queries ORDER BY created_at DESC").fetchall()
    db.close()
    return [SavedQuery(**dict(r)) for r in rows]


@router.delete("/{query_id}")
def delete_saved_query(query_id: str):
    db = _get_db()
    cursor = db.execute("DELETE FROM saved_queries WHERE id = ?", (query_id,))
    db.commit()
    db.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    return {"ok": True}
