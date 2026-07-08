"""PHASE-1: wallet router (topup + balance + ledger view)."""
from __future__ import annotations
import os

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.chat import WalletBalance, WalletTopupRequest
from app.services.wallet import WalletService

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.post("/topup")
async def topup(req: WalletTopupRequest, db: AsyncSession = Depends(get_session)):
    # PROD SAFETY: raw topup is DEV-ONLY. Real money must come from the
    # payment provider (Zarinpal) verified callback, never a raw POST.
    if os.getenv("ALLOW_DEV_TOPUP", "false").lower() != "true":
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={
            "error": "topup_disabled",
            "detail": "Topup only via verified payment callback."})
    ws = WalletService(db)
    bal = await ws.topup(req.user_id, req.amount_irr)
    return WalletBalance(user_id=req.user_id, balance_irr=bal, currency="IRR")


@router.get("/{user_id}/balance")
async def balance(user_id: int, db: AsyncSession = Depends(get_session)):
    ws = WalletService(db)
    bal = await ws.balance(user_id)
    return WalletBalance(user_id=user_id, balance_irr=bal, currency="IRR")


@router.get("/{user_id}/ledger")
async def ledger(user_id: int, limit: int = 50, db: AsyncSession = Depends(get_session)):
    from app.models import Ledger
    rows = await db.scalars(
        select(Ledger).where(Ledger.user_id == user_id)
        .order_by(Ledger.id.desc()).limit(limit)
    )
    return [
        {"txn_type": r.txn_type, "amount_irr": r.amount_irr,
         "balance_after_irr": r.balance_after_irr, "created_at": r.created_at.isoformat()}
        for r in rows
    ]
