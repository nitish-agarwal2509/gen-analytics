"""Audit log endpoint -- read-only access to query history."""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.db.database import async_session
from app.db.models import AuditLog

router = APIRouter(prefix="/audit-log", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    session_id: str | None
    question: str
    generated_sql: str | None
    bytes_scanned: int | None
    cost_usd: float | None
    success: bool
    error_message: str | None
    created_at: str


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_log(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    async with async_session() as session:
        result = await session.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [
            AuditLogResponse(
                id=r.id,
                user_id=r.user_id,
                session_id=r.session_id,
                question=r.question,
                generated_sql=r.generated_sql,
                bytes_scanned=r.bytes_scanned,
                cost_usd=r.cost_usd,
                success=r.success,
                error_message=r.error_message,
                created_at=r.created_at.isoformat(),
            )
            for r in result.scalars().all()
        ]
