"""Async SQLAlchemy engine and session factory. Supports MySQL and SQLite."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

_SQLITE_URL = "sqlite+aiosqlite:///data/gen_analytics.db"


def _get_db_url() -> str:
    return settings.mysql_url or _SQLITE_URL


engine = create_async_engine(_get_db_url(), echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables (idempotent)."""
    from app.db.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
