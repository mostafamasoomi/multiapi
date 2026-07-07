"""PHASE-0: FastAPI bootstrap. Health + readiness only.

Module boundaries (PHASE-0 skeleton):
  app/core/     -> config, security primitives, fx/pricing interfaces
  app/db/       -> engine, session, migrations
  app/models/   -> SQLAlchemy ORM (mapped to PHASE-0 tables)
  app/schemas/  -> pydantic request/response models
  app/services/ -> business logic (wallet, pricing, fx, holds)
  app/routers/  -> HTTP/REST endpoints (users, wallet, chat/completions, admin)

No money logic in routers — it lives in services/.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # PHASE-1 will: run migrations, warm fx cache, start brake monitors.
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/ready", tags=["system"])
async def ready():
    # PHASE-1: also check DB + Redis + 9Router reachability (localhost).
    return {
        "status": "ready",
        "ninrouter_internal": settings.ninrouter_is_internal,
    }
