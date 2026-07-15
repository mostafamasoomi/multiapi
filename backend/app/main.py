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
from app.db.migrate import migrate
from app.services.ninrouter import close_http_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("multiapi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks."""
    logger.info(f"Starting {settings.app_name} API...")
    if settings.env != "test":
        try:
            await migrate()
        except Exception:
            logger.exception("Database migration failed; refusing to start")
            raise
    yield
    # Shutdown: close httpx client
    logger.info("Shutting down...")
    await close_http_client()


# SECURITY: Disable OpenAPI docs in production to prevent API schema exposure
_docs_url = "/docs" if not settings.is_prod else None
_redoc_url = "/redoc" if not settings.is_prod else None
_openapi_url = "/openapi.json" if not settings.is_prod else None

app = FastAPI(
    title=f"{settings.app_name} API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

# CORS — restrict to known origins (exclude localhost in production)
_cors_origins = [
    "https://api.multiai.ir",
    "https://multiai.ir",
]
if not settings.is_prod:
    _cors_origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

from app.routers import chat, wallet, admin, payment, auth, notifications, referral, api_keys, conversations  # noqa: E402
app.include_router(chat.router)
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(payment.router)
app.include_router(auth.router)
app.include_router(notifications.router)
app.include_router(referral.router)
app.include_router(api_keys.router)
app.include_router(conversations.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/ready", tags=["system"])
async def ready():
    # SECURITY: Don't expose internal configuration details
    return {"status": "ready"}
