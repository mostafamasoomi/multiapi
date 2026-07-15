"""PHASE-3: admin router.

Admin can:
  * list/update model pricing (margin factors) -> backend recomputes sell price from fx
  * view per-user token usage + wallet balance (monitoring)
  * view P&L daily + trigger brakes manually
  * toggle model active/disabled
  * manage FX rates (set daily rate, view history)
  * manage users (view, update plan, topup)
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.db.session import get_session
from app.models import FxRate, GlobalSetting, Ledger, ModelAlias, PnlDaily, Pricing, Quota, User, Wallet
from app.services.brakes import BrakeService
from app.services.wallet import WalletService

logger = logging.getLogger(__name__)

admin = APIRouter(prefix="/admin", tags=["admin"])
router = admin


class MarginUpdate(BaseModel):
    alias: str
    input_margin_factor: float
    output_margin_factor: float


class FxRateSet(BaseModel):
    usd_to_irr: float
    fx_buffer: float = 1.12
    source: str | None = None


class UserTopup(BaseModel):
    user_id: int
    amount_irr: int = Field(gt=0, le=100_000_000_000)
    note: str | None = None


class UserUpdatePlan(BaseModel):
    user_id: int
    plan_id: int | None = None
    daily_spend_cap_irr: int | None = None
    status: str | None = None


# ── Models ─────────────────────────────────────────────────────────────────────

@admin.get("/models")
async def list_models(
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
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
            "context_window": ma.context_window,
        })
    return out


@admin.post("/models/margin")
async def update_margin(
    u: MarginUpdate,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == u.alias))
    if not ma:
        raise HTTPException(404, "model not found")
    pr = await db.scalar(select(Pricing).where(Pricing.model_alias_id == ma.id))
    pr.input_margin_factor = u.input_margin_factor
    pr.output_margin_factor = u.output_margin_factor
    pr.updated_at = func.now()
    await db.commit()
    return {"ok": True, "alias": u.alias, "sell_price_derived_from_fx": True}


@admin.post("/models/{alias}/toggle")
async def toggle_model(
    alias: str,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
    if not ma:
        raise HTTPException(404, "model not found")
    ma.is_active = not ma.is_active
    ma.auto_disabled = False
    await db.commit()
    return {"alias": alias, "active": ma.is_active}


# ── Users ──────────────────────────────────────────────────────────────────────

@admin.get("/users")
async def list_users(
    limit: int = 50,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """List users with wallet balances."""
    rows = await db.execute(select(User, Wallet).join(
        Wallet, Wallet.user_id == User.id, isouter=True).limit(limit))
    out = []
    for u, w in rows:
        out.append({
            "id": u.id, "email": u.email, "username": u.username,
            "telegram_id": u.telegram_id, "status": u.status,
            "plan_id": u.plan_id, "balance_irr": w.balance_irr if w else 0,
            "daily_spend_used_irr": u.daily_spend_used_irr,
            "daily_spend_cap_irr": u.daily_spend_cap_irr,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return out


@admin.get("/users/{user_id}/usage")
async def user_usage(
    user_id: int,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
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


@admin.post("/users/topup")
async def user_topup(
    t: UserTopup,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Admin topup for a user."""
    ws = WalletService(db)
    try:
        new_balance = await ws.topup(t.user_id, t.amount_irr,
                                     note=t.note or "admin topup")
    except Exception as e:
        logger.error(f"Admin topup failed for user {t.user_id}: {e}")
        raise HTTPException(400, "topup failed")
    return {"ok": True, "user_id": t.user_id, "new_balance_irr": new_balance}


@admin.post("/users/update")
async def user_update(
    u: UserUpdatePlan,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Update user plan, spend cap, or status."""
    user = await db.scalar(select(User).where(User.id == u.user_id))
    if not user:
        raise HTTPException(404, "user not found")
    if u.plan_id is not None:
        user.plan_id = u.plan_id
    if u.daily_spend_cap_irr is not None:
        user.daily_spend_cap_irr = u.daily_spend_cap_irr
    if u.status is not None:
        user.status = u.status
    user.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True, "user_id": u.user_id}


@admin.get("/users/{user_id}/ledger")
async def user_ledger(
    user_id: int,
    limit: int = 50,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Get user's ledger (transaction history)."""
    result = await db.execute(
        select(Ledger).where(Ledger.user_id == user_id)
        .order_by(Ledger.created_at.desc()).limit(limit))
    return [
        {"id": r.id, "txn_type": r.txn_type, "amount_irr": r.amount_irr,
         "balance_after_irr": r.balance_after_irr, "note": r.note,
         "ref_type": r.ref_type, "ref_id": r.ref_id,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in result.scalars()
    ]


# ── P&L ────────────────────────────────────────────────────────────────────────

@admin.get("/pnl")
async def pnl(
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    rows = await db.execute(select(PnlDaily).order_by(PnlDaily.day.desc()).limit(30))
    return [
        {"day": r.day.isoformat(), "revenue_irr": r.revenue_irr,
         "upstream_cost_usd": float(r.upstream_cost_usd),
         "gross_margin_pct": float(r.gross_margin_pct) if r.gross_margin_pct else None}
        for r in rows.scalars()
    ]


# ── FX Rates ───────────────────────────────────────────────────────────────────

@admin.get("/fx")
async def get_current_fx(
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Get current FX rate."""
    row = await db.scalar(select(FxRate).order_by(FxRate.rate_date.desc()).limit(1))
    if not row:
        raise HTTPException(404, "no FX rate set")
    return {
        "rate_date": row.rate_date.isoformat(),
        "usd_to_irr": float(row.usd_to_irr),
        "fx_buffer": float(row.fx_buffer),
        "effective_rate": float(row.usd_to_irr) * float(row.fx_buffer),
        "source": row.source,
    }


@admin.get("/fx/history")
async def fx_history(
    days: int = 30,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Get FX rate history."""
    rows = await db.execute(
        select(FxRate).order_by(FxRate.rate_date.desc()).limit(days))
    return [
        {"rate_date": r.rate_date.isoformat(), "usd_to_irr": float(r.usd_to_irr),
         "fx_buffer": float(r.fx_buffer), "source": r.source}
        for r in rows.scalars()
    ]


@admin.post("/fx")
async def set_fx_rate(
    fx: FxRateSet,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Set today's FX rate. Checks circuit breaker first."""
    last = await db.scalar(select(FxRate).order_by(FxRate.rate_date.desc()).limit(1))
    if last:
        bs = BrakeService(db)
        tripped = await bs.fx_circuit_breaker(fx.usd_to_irr, float(last.usd_to_irr))
        if tripped:
            raise HTTPException(429, {
                "error": "fx_circuit_breaker_tripped",
                "message": "FX rate spiked >5% from last pricing rate. Topups locked.",
                "last_rate": float(last.usd_to_irr),
                "new_rate": fx.usd_to_irr,
            })

    today = date.today()
    existing = await db.scalar(select(FxRate).where(FxRate.rate_date == today))
    if existing:
        existing.usd_to_irr = fx.usd_to_irr
        existing.fx_buffer = fx.fx_buffer
        existing.source = fx.source
    else:
        db.add(FxRate(rate_date=today, usd_to_irr=fx.usd_to_irr,
                      fx_buffer=fx.fx_buffer, source=fx.source))
    await db.commit()
    return {"ok": True, "rate_date": today.isoformat(),
            "effective_rate": fx.usd_to_irr * fx.fx_buffer}


# ── Brakes ─────────────────────────────────────────────────────────────────────

@admin.get("/brakes/status")
async def brakes_status(
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Check all brake statuses."""
    bs = BrakeService(db)
    kill_switch = await bs.global_settings("kill_switch")
    fx_breaker = await bs.global_settings("fx_circuit_breaker")
    pnl_today = await db.scalar(select(PnlDaily).where(PnlDaily.day == date.today()))
    return {
        "kill_switch": kill_switch,
        "fx_circuit_breaker": fx_breaker,
        "today_cost_usd": float(pnl_today.upstream_cost_usd) if pnl_today else 0,
        "today_revenue_irr": pnl_today.revenue_irr if pnl_today else 0,
    }


@admin.post("/brakes/kill-switch")
async def toggle_kill_switch(
    enable: bool = True,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Toggle global kill switch."""
    bs = BrakeService(db)
    cfg = await bs.global_settings("kill_switch")
    cfg["enabled"] = enable
    cfg["restrict_to_subscribers"] = enable
    cfg["toggled_at"] = datetime.utcnow().isoformat()
    await bs._set("kill_switch", cfg)
    return {"ok": True, "kill_switch_enabled": enable}


@admin.post("/brakes/margin-check")
async def run_margin_brake(
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Manually run per-model margin brake check."""
    bs = BrakeService(db)
    disabled = await bs.per_model_margin_brake()
    return {"ok": True, "disabled_models": disabled}


# ── Telegram Registration ──────────────────────────────────────────────────────

class TelegramRegister(BaseModel):
    telegram_id: str
    username: str | None = None


@admin.post("/users/register-telegram")
async def register_telegram_user(
    t: TelegramRegister,
    db: AsyncSession = Depends(get_session),
    _auth: None = Depends(require_admin),
):
    """Register or get existing Telegram user (bot calls with admin token)."""
    ws = WalletService(db)
    user = await db.scalar(
        select(User).where(User.telegram_id == t.telegram_id))
    if user:
        balance = await ws.balance(user.id)
        return {
            "user_id": user.id,
            "balance_irr": balance,
            "status": user.status,
            "plan_id": user.plan_id,
        }

    user = User(
        telegram_id=t.telegram_id,
        username=t.username,
        status="active",
        plan_id=None,
    )
    db.add(user)
    await db.flush()

    wallet = Wallet(user_id=user.id, balance_irr=0)
    db.add(wallet)
    await db.commit()
    await db.refresh(user)

    return {
        "user_id": user.id,
        "balance_irr": 0,
        "status": "active",
        "plan_id": None,
    }


# ── Public Models API (for bot) ────────────────────────────────────────────────

@admin.get("/models/list")
async def list_models_public(
    db: AsyncSession = Depends(get_session),
):
    """Public models list (no auth needed — used by frontend)."""
    rows = await db.execute(select(ModelAlias).where(
        ModelAlias.is_active == True, ModelAlias.auto_disabled == False))
    return [
        {"alias": m.alias, "tier": m.tier, "active": m.is_active,
         "auto_disabled": m.auto_disabled, "free_tier_eligible": m.free_tier_eligible,
         "context_window": m.context_window}
        for m in rows.scalars()
    ]


# ── User Detail ──────────────────────────────────────────────────────────────

@admin.get("/users/{user_id}")
async def user_detail(
    user_id: int,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Get full user detail including wallet, referrals, API keys count."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "user not found")
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user_id))
    
    # Count referrals
    from app.models.orm import Referral, UserApiToken, Conversation
    ref_count = await db.scalar(
        select(func.count()).select_from(Referral).where(Referral.referrer_user_id == user_id)
    ) or 0
    
    # Count API keys
    key_count = await db.scalar(
        select(func.count()).select_from(UserApiToken).where(
            UserApiToken.user_id == user_id, UserApiToken.revoked == False
        )
    ) or 0
    
    # Count conversations
    conv_count = await db.scalar(
        select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)
    ) or 0
    
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "phone": user.phone,
        "telegram_id": user.telegram_id,
        "status": user.status,
        "plan_id": user.plan_id,
        "is_internal": user.is_internal,
        "balance_irr": wallet.balance_irr if wallet else 0,
        "daily_spend_used_irr": user.daily_spend_used_irr,
        "daily_spend_cap_irr": user.daily_spend_cap_irr,
        "referral_count": ref_count,
        "api_key_count": key_count,
        "conversation_count": conv_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


# ── Notifications Management ─────────────────────────────────────────────────

@admin.get("/notifications")
async def list_all_notifications(
    limit: int = 50,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """List recent notifications across all users."""
    from app.models.orm import Notification
    rows = await db.execute(
        select(Notification, User.email).join(
            User, Notification.user_id == User.id, isouter=True
        ).order_by(Notification.created_at.desc()).limit(limit)
    )
    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "user_email": email,
            "message": n.message,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n, email in rows
    ]


class NotificationCreate(BaseModel):
    user_id: int
    message: str = Field(min_length=1)


@admin.post("/notifications")
async def send_notification(
    body: NotificationCreate,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Send notification to a user."""
    from app.models.orm import Notification

    notif = Notification(user_id=body.user_id, message=body.message)
    db.add(notif)
    await db.commit()
    return {"ok": True, "message": "notification sent"}


# ── Payment Orders ───────────────────────────────────────────────────────────

@admin.get("/payments")
async def list_all_payments(
    limit: int = 50,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """List recent payment orders."""
    from app.models.orm import PaymentOrder
    rows = await db.execute(
        select(PaymentOrder, User.email).join(
            User, PaymentOrder.user_id == User.id, isouter=True
        ).order_by(PaymentOrder.created_at.desc()).limit(limit)
    )
    return [
        {
            "id": o.id,
            "user_id": o.user_id,
            "user_email": email,
            "amount_irr": o.amount_irr,
            "status": o.status,
            "authority": o.authority,
            "ref_id": o.ref_id,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o, email in rows
    ]


# ── User Topup with Notification ────────────────────────────────────────────

@admin.post("/users/topup-with-notify")
async def user_topup_with_notify(
    t: UserTopup,
    _auth: str = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
):
    """Admin topup + send notification to user."""
    from app.models.orm import Notification
    ws = WalletService(db)
    try:
        new_balance = await ws.topup(t.user_id, t.amount_irr,
                                     note=t.note or "admin topup")
    except Exception as e:
        logger.error(f"Admin topup-with-notify failed for user {t.user_id}: {e}")
        raise HTTPException(400, "topup failed")
    
    # Send notification
    notif = Notification(
        user_id=t.user_id,
        message=f"شارژ کیف پول به مبلغ {t.amount_irr:,} ریال توسط ادمین انجام شد. موجودی جدید: {new_balance:,} ریال"
    )
    db.add(notif)
    await db.commit()
    
    return {"ok": True, "user_id": t.user_id, "new_balance_irr": new_balance}
