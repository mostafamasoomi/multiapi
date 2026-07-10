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

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.ninrouter import close_http_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("multiapi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks."""
    logger.info(f"Starting {settings.app_name} API...")
    yield
    # Shutdown: close httpx client
    logger.info("Shutting down...")
    await close_http_client()


app = FastAPI(title=f"{settings.app_name} API", version="0.1.0", lifespan=lifespan)

# CORS — restrict to known origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://api.multiai.ir",
        "https://multiai.ir",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

from app.routers import chat, wallet, admin, payment, auth  # noqa: E402
app.include_router(chat.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(payment.router)
app.include_router(auth.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/ready", tags=["system"])
async def ready():
    return {"status": "ready", "ninrouter_internal": settings.ninrouter_is_internal}
