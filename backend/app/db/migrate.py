"""Small, idempotent SQL migration runner for the deployed backend image."""
from __future__ import annotations

import asyncio
from pathlib import Path

from sqlalchemy import text

from app.db.session import engine

MIGRATIONS = Path(__file__).parent / "migrations"


async def migrate() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        applied = {
            row[0] for row in (await conn.execute(
                text("SELECT version FROM schema_migrations")
            )).all()
        }
        for path in sorted(MIGRATIONS.glob("*.sql")):
            version = path.name
            if version in applied:
                continue
            sql = path.read_text()
            # Migration files are trusted repository code, but comments and
            # dollar-quoted functions make naive semicolon splitting unsafe.
            await conn.execute(text(sql))
            await conn.execute(
                text("INSERT INTO schema_migrations(version) VALUES (:version)"),
                {"version": version},
            )


if __name__ == "__main__":
    asyncio.run(migrate())
