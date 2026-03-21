"""Saved queries endpoints -- async CRUD backed by MySQL or SQLite."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.db.database import async_session
from app.db.models import SavedQuery

router = APIRouter(prefix="/saved-queries", tags=["saved-queries"])


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


def _to_response(row: SavedQuery) -> SavedQueryResponse:
    return SavedQueryResponse(
        id=row.id,
        name=row.name,
        description=row.description,
        question=row.question,
        sql=row.sql,
        viz_config=json.loads(row.viz_config) if row.viz_config else None,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


@router.get("", response_model=list[SavedQueryResponse])
async def list_saved_queries():
    async with async_session() as session:
        result = await session.execute(
            select(SavedQuery).order_by(SavedQuery.created_at.desc())
        )
        return [_to_response(r) for r in result.scalars().all()]


@router.post("", response_model=SavedQueryResponse, status_code=201)
async def create_saved_query(body: SavedQueryCreate):
    row = SavedQuery(
        name=body.name,
        description=body.description,
        question=body.question,
        sql=body.sql,
        viz_config=json.dumps(body.viz_config) if body.viz_config else None,
    )
    async with async_session() as session:
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return _to_response(row)


@router.delete("/{query_id}", status_code=204)
async def delete_saved_query(query_id: str):
    async with async_session() as session:
        row = await session.get(SavedQuery, query_id)
        if not row:
            raise HTTPException(status_code=404, detail="Saved query not found")
        await session.delete(row)
        await session.commit()
