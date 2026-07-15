"""PHASE-0: async SQLAlchemy engine + session factory."""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=(settings.env == "dev"),
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, expire_on_commit=False, class_=AsyncSession
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


# Alias for use in background tasks / settlement that need a fresh session
async_session = AsyncSessionLocal
