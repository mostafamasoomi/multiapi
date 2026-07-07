"""PHASE-0/1: FastAPI bootstrap.

Module boundaries:
  app/core/     -> config, security primitives, fx/pricing interfaces
  app/db/       -> engine, session, migrations
  app/models/   -> SQLAlchemy ORM
  app/schemas/  -> pydantic request/response
  app/services/ -> business logic (wallet, pricing, fx, holds, 9router)
  app/routers/  -> HTTP endpoints (users, wallet, chat, admin)

No money logic in routers — it lives in services/.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # PHASE-3: run brakes monitors, fx cache warm, pnl_daily cron.
    yield


app = FastAPI(title=f"{settings.app_name} API", version="0.1.0", lifespan=lifespan)

from app.routers import chat, wallet, admin, payment  # noqa: E402

app.include_router(chat.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(payment.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/ready", tags=["system"])
async def ready():
    return {"status": "ready", "ninrouter_internal": settings.ninrouter_is_internal}
