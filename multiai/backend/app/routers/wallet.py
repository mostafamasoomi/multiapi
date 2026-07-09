"""PHASE-1: wallet router (topup + balance + ledger view)."""
from __future__ import annotations
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.chat import WalletBalance, WalletTopupRequest
from app.services.wallet import WalletService
from app.auth import MASTER_SECRET
import hmac as _hmac
import hashlib

router = APIRouter(prefix="/wallet", tags=["wallet"])


def _verify_user(authorization: str = Header(None)) -> int:
    """Extract user_id from API key."""
    api_key = (authorization or "").replace("Bearer ", "")
    if not api_key or "." not in api_key:
        raise HTTPException(status_code=401, detail="unauthorized")
    user_str, sig = api_key.split(".", 1)
    try:
        user_id = int(user_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="unauthorized")
    expected = _hmac.HMAC(MASTER_SECRET.encode(), user_str.encode(),
                          hashlib.sha256).hexdigest()
    if not _hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="unauthorized")
    return user_id


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


@router.get("/me/balance")
async def my_balance(user_id: int = Depends(_verify_user),
                     db: AsyncSession = Depends(get_session)):
    """Get own wallet balance (auth required)."""
    ws = WalletService(db)
    bal = await ws.balance(user_id)
    return WalletBalance(user_id=user_id, balance_irr=bal, currency="IRR")


@router.get("/me/ledger")
async def my_ledger(user_id: int = Depends(_verify_user),
                    limit: int = 50, db: AsyncSession = Depends(get_session)):
    """Get own ledger (auth required)."""
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
