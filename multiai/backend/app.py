from __future__ import annotations
import os
from collections.abc import AsyncIterator
from datetime import datetime, date, timedelta
from typing import Any
from contextlib import asynccontextmanager
import httpx, redis.asyncio as redis, uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, JSON, select, text, desc
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
DATABASE_URL = os.getenv("DATABASE_URL","postgresql+asyncpg://multiai2:multiai2_dev_pass@postgres:5432/multiai2")
REDIS_URL = os.getenv("REDIS_URL","redis://redis:6379/0")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN","")
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[str | None]
    email: Mapped[str | None]
    username: Mapped[str | None]
    plan_id: Mapped[int | None]
    status: Mapped[str] = mapped_column(default="active")
    is_internal: Mapped[bool] = mapped_column(default=False)
    daily_spend_cap_irr: Mapped[int] = mapped_column(default=0)
    daily_spend_used_irr: Mapped[int] = mapped_column(default=0)
    spend_date: Mapped[date | None]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(index=True)
    plan: Mapped[str]
    starts_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    ends_at: Mapped[datetime]
class Ledger(Base):
    __tablename__ = "ledger"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(index=True)
    txn_type: Mapped[str]
    amount_irr: Mapped[int]
    balance_after_irr: Mapped[int]
    ref_type: Mapped[str | None]
    ref_id: Mapped[str | None]
    note: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
class Price(Base):
    __tablename__ = "prices"
    id: Mapped[int] = mapped_column(primary_key=True)
    model: Mapped[str] = mapped_column(unique=True)
    currency: Mapped[str]
    input_price: Mapped[int]
    output_price: Mapped[int]
    fx_rate: Mapped[int]
    margin_numer: Mapped[int] = mapped_column(default=12)
    margin_denom: Mapped[int] = mapped_column(default=10)
    active: Mapped[bool] = mapped_column(default=True)
    updated_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
class ModelItem(Base):
    __tablename__ = "models"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(unique=True)
    upstream: Mapped[str]
    aliases: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    hidden: Mapped[bool] = mapped_column(default=False)
    sort: Mapped[int] = mapped_column(default=0)
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield
app = FastAPI(title="Persian AI Gateway", lifespan=lifespan)
async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session() as session:
        yield session
async def get_redis() -> AsyncIterator[redis.Redis]:
    client = redis.from_url(REDIS_URL)
    try: yield client
    finally: await client.aclose()
class MeterReq(BaseModel):
    user_id: int = Field(ge=1)
    model: str
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
class ChatReq(BaseModel):
    model: str
    messages: list[dict[str, Any]]
    stream: bool | None = False
    user_id: int
@app.post("/admin/meter")
async def meter_usage(payload: MeterReq, request: Request, db: AsyncSession = Depends(get_db), r: redis.Redis = Depends(get_redis)) -> JSONResponse:
    if not INTERNAL_TOKEN or request.headers.get("X-Internal-Token") != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    price = await db.get(Price, payload.model)
    if price is None or not price.active:
        raise HTTPException(status_code=400, detail=f"price not found for {payload.model}")
    margin = price.margin_numer / price.margin_denom
    raw_irr = (price.input_price * payload.prompt_tokens + price.output_price * payload.completion_tokens) / 1_000_000
    charge = int(raw_irr * margin * price.fx_rate)
    if charge <= 0:
        charge = 1
    today = date.today()
    user = await db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=402, detail="user not found")
    if user.spend_date != today:
        user.daily_spend_used_irr = 0
        user.spend_date = today
    if user.daily_spend_used_irr + charge > user.daily_spend_cap_irr and user.daily_spend_cap_irr > 0:
        raise HTTPException(status_code=402, detail="daily cap exceeded")
    # Get current balance from latest ledger entry
    balance_stmt = select(Ledger.balance_after_irr).where(Ledger.user_id == user_id).order_by(desc(Ledger.created_at)).limit(1)
    balance_result = await db.execute(balance_stmt)
    current_balance = balance_result.scalar_one_or_none() or 0
    new_balance = current_balance - charge
    if new_balance < 0:
        raise HTTPException(status_code=402, detail="insufficient balance")
    async with db.begin():
        db.add(Ledger(user_id=payload.user_id, txn_type="fee", amount_irr=-charge, balance_after_irr=new_balance, ref_type="chat.completions", ref_id=str(payload.model), note=f"{payload.prompt_tokens}/{payload.completion_tokens} tokens"))
        user.daily_spend_used_irr = user.daily_spend_used_irr + charge
    await db.commit()
    return JSONResponse({"ok": True, "charged": charge, "balance_after": new_balance})
@app.get("/me/usage")
async def usage(user_id: int, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    since = func.now() - text("interval '30 days'")
    stmt = select(func.sum(Ledger.amount_irr), func.count(Ledger.id)).where(Ledger.user_id == user_id, Ledger.txn_type == "fee", Ledger.created_at >= since)
    result = await db.execute(stmt)
    total_spend, count = result.one_or_none() or (0, 0)
    return JSONResponse({"user_id": user_id, "window_days": 30, "total_spend": int(total_spend or 0), "turns": int(count or 0)})
@app.get("/admin/pricing")
async def admin_pricing(request: Request, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    if not INTERNAL_TOKEN or request.headers.get("X-Internal-Token") != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    items = await db.execute(select(Price).order_by(Price.model))
    rows = [{"model": p.model, "input_price": p.input_price, "output_price": p.output_price, "fx_rate": p.fx_rate, "margin_numer": p.margin_numer, "margin_denom": p.margin_denom, "active": p.active} for p in items.scalars()]
    return JSONResponse({"items": rows})
@app.post("/v1/chat/completions")
async def chat_completions(payload: ChatReq, db: AsyncSession = Depends(get_db)) -> Response:
    url = os.getenv("LITELLM_HOST")
    if not url:
        raise HTTPException(status_code=500, detail="LITELLM_HOST not configured")
    full_url = f"{url}/v1/chat/completions"
    auth_header = {}
    api_key = os.getenv("LITELLM_API_KEY","")
    if api_key:
        auth_header["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=None, write=10, pool=10)) as client:
        upstream = await client.post(full_url, json=payload.model_dump(), headers=auth_header)
    return Response(content=upstream.content, status_code=upstream.status_code, media_type=upstream.headers.get("content-type", "application/json"))
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
