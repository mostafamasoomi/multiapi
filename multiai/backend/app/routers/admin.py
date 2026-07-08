"""PHASE-3: admin router.

Admin can:
  * list/update model pricing (margin factors) -> backend recomputes sell price from fx
  * view per-user token usage + wallet balance (monitoring)
  * view P&L daily + trigger brakes manually
  * toggle model active/disabled

[VERIFY] Auth: a real admin-auth scheme (API key / role) must wrap these.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Ledger, ModelAlias, PnlDaily, Pricing, Quota, User, Wallet

admin = APIRouter(prefix="/admin", tags=["admin"])
router = admin  # alias so main.py include_router(admin.router) works


class MarginUpdate(BaseModel):
    alias: str
    input_margin_factor: float
    output_margin_factor: float


@admin.get("/models")
async def list_models(db: AsyncSession = Depends(get_session)):
    rows = await db.execute(select(ModelAlias, Pricing).join(
        Pricing, Pricing.model_alias_id == ModelAlias.id))
    out = []
    for ma, pr in rows:
        out.append({
            "alias": ma.alias, "tier": ma.tier, "active": ma.is_active,
            "auto_disabled": ma.auto_disabled, "free_tier_eligible": ma.free_tier_eligible,
            "up_in": float(ma.upstream_cost_input_usd_per_1m),
            "up_out": float(ma.upstream_cost_output_usd_per_1m),
            "in_margin": float(pr.input_margin_factor),
            "out_margin": float(pr.output_margin_factor),
            "max_tokens_cap": ma.max_tokens_cap,
        })
    return out


@admin.post("/models/margin")
async def update_margin(u: MarginUpdate, db: AsyncSession = Depends(get_session)):
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == u.alias))
    if not ma:
        raise HTTPException(404, "model not found")
    pr = await db.scalar(select(Pricing).where(Pricing.model_alias_id == ma.id))
    pr.input_margin_factor = u.input_margin_factor
    pr.output_margin_factor = u.output_margin_factor
    pr.updated_at = func.now()
    await db.commit()
    return {"ok": True, "alias": u.alias,
            "sell_price_derived_from_fx": True}


@admin.post("/models/{alias}/toggle")
async def toggle_model(alias: str, db: AsyncSession = Depends(get_session)):
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
    if not ma:
        raise HTTPException(404, "model not found")
    ma.is_active = not ma.is_active
    ma.auto_disabled = False
    await db.commit()
    return {"alias": alias, "active": ma.is_active}


@admin.get("/users/{user_id}/usage")
async def user_usage(user_id: int, db: AsyncSession = Depends(get_session)):
    w = await db.scalar(select(Wallet).where(Wallet.user_id == user_id))
    rows = await db.execute(
        select(Quota.model_alias_id, func.sum(Quota.used_tokens))
        .where(Quota.user_id == user_id).group_by(Quota.model_alias_id))
    usage = [{"model_alias_id": m, "used_tokens": t} for m, t in rows]
    return {
        "user_id": user_id,
        "balance_irr": w.balance_irr if w else 0,
        "token_usage_by_model": usage,
    }


@admin.get("/pnl")
async def pnl(db: AsyncSession = Depends(get_session)):
    rows = await db.execute(select(PnlDaily).order_by(PnlDaily.day.desc()).limit(30))
    return [
        {"day": r.day.isoformat(), "revenue_irr": r.revenue_irr,
         "upstream_cost_usd": float(r.upstream_cost_usd),
         "gross_margin_pct": float(r.gross_margin_pct) if r.gross_margin_pct else None}
        for r in rows
    ]
