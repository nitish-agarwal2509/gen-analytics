"""Saved queries endpoints -- CRUD for user-saved queries in SQLite."""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/saved-queries", tags=["saved-queries"])

_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "saved_queries.db")


def _get_db() -> sqlite3.Connection:
    db_path = os.path.abspath(_DB_PATH)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS saved_queries (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            question TEXT NOT NULL,
            sql TEXT NOT NULL,
            viz_config TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    return conn


class SavedQueryCreate(BaseModel):
    name: str
    description: str | None = None
    question: str
    sql: str
    viz_config: dict | None = None


class SavedQueryResponse(BaseModel):
    id: str
    name: str
    description: str | None
    question: str
    sql: str
    viz_config: dict | None
    created_at: str
    updated_at: str


def _row_to_response(row: sqlite3.Row) -> SavedQueryResponse:
    viz = row["viz_config"]
    return SavedQueryResponse(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        question=row["question"],
        sql=row["sql"],
        viz_config=json.loads(viz) if viz else None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=list[SavedQueryResponse])
def list_saved_queries():
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM saved_queries ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [_row_to_response(r) for r in rows]


@router.post("", response_model=SavedQueryResponse, status_code=201)
def create_saved_query(body: SavedQueryCreate):
    conn = _get_db()
    query_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    viz_json = json.dumps(body.viz_config) if body.viz_config else None

    conn.execute(
        "INSERT INTO saved_queries (id, name, description, question, sql, viz_config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (query_id, body.name, body.description, body.question, body.sql, viz_json, now, now),
    )
    conn.commit()

    row = conn.execute("SELECT * FROM saved_queries WHERE id = ?", (query_id,)).fetchone()
    conn.close()
    return _row_to_response(row)


@router.delete("/{query_id}", status_code=204)
def delete_saved_query(query_id: str):
    conn = _get_db()
    cursor = conn.execute("DELETE FROM saved_queries WHERE id = ?", (query_id,))
    conn.commit()
    conn.close()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Saved query not found")
