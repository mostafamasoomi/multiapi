"""PHASE-1: Wallet service — prepaid-only, two-phase HOLD/SETTLE.

Hard rules enforced:
  * balance NEVER negative (DB CHECK + this layer rejects).
  * PREPAID ONLY: insufficient funds -> raise InsufficientFunds (HTTP 402 upstream).
  * HOLD before 9Router, SETTLE after stream.
  * On stream drop / missing usage -> settle at FULL hold (platform-favorable).
  * max_tokens server-side capped (caller must cap before calling).
All mutations append to ledger (immutable).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Hold, Ledger, Wallet, User


class InsufficientFunds(HTTPException):
    def __init__(self, need: int, have: int):
        super().__init__(status_code=402, detail={
            "error": "insufficient_funds",
            "required_irr": need, "available_irr": have})


class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_wallet(self, user_id: int) -> Wallet:
        w = await self.db.scalar(select(Wallet).where(Wallet.user_id == user_id))
        if not w:
            w = Wallet(user_id=user_id, balance_irr=0)
            self.db.add(w)
            await self.db.commit()
            await self.db.refresh(w)
        return w

    async def balance(self, user_id: int) -> int:
        w = await self.get_or_create_wallet(user_id)
        return w.balance_irr

    async def _append_ledger(self, user_id: int, txn_type: str, amount: int,
                             note: str | None = None, ref_type: str | None = None,
                             ref_id: str | None = None) -> Ledger:
        w = await self.get_or_create_wallet(user_id)
        w.balance_irr += amount
        if w.balance_irr < 0:
            # defensive: never persist negative
            raise RuntimeError("wallet would go negative — blocked")
        w.updated_at = datetime.utcnow()
        led = Ledger(user_id=user_id, txn_type=txn_type, amount_irr=amount,
                     balance_after_irr=w.balance_irr, note=note,
                     ref_type=ref_type, ref_id=ref_id)
        self.db.add(led)
        return led

    async def topup(self, user_id: int, amount_irr: int) -> int:
        if amount_irr <= 0:
            raise ValueError("amount must be positive")
        led = await self._append_ledger(user_id, "topup", amount_irr,
                                         note="wallet topup", ref_type="payment")
        await self.db.commit()
        await self.db.refresh(led)
        return led.balance_after_irr

    # ---- Two-phase HOLD ----
    async def place_hold(self, user_id: int, estimated_cost_irr: int,
                         request_id: str, model_alias: str,
                         overprovision: float = 1.1) -> Hold:
        required = int(estimated_cost_irr * overprovision)
        w = await self.get_or_create_wallet(user_id)
        if w.balance_irr < required:
            raise InsufficientFunds(need=required, have=w.balance_irr)
        # deduct hold immediately (prepaid lock)
        await self._append_ledger(user_id, "hold", -required,
                                  note=f"hold {request_id}", ref_type="hold", ref_id=request_id)
        hold = Hold(user_id=user_id, request_id=request_id,
                    hold_amount_irr=required, status="active",
                    model_alias=model_alias,
                    expires_at=datetime.utcnow() + timedelta(hours=1))
        self.db.add(hold)
        await self.db.commit()
        await self.db.refresh(hold)
        return hold

    async def settle(self, request_id: str, actual_cost_irr: int | None) -> Hold:
        hold = await self.db.scalar(select(Hold).where(Hold.request_id == request_id))
        if not hold or hold.status != "active":
            raise ValueError("hold not active / not found")
        if actual_cost_irr is None:
            # stream dropped or usage missing -> settle at FULL hold (platform-favorable)
            actual_cost_irr = hold.hold_amount_irr
        # release remainder (hold already deducted full amount at place time)
        remainder = hold.hold_amount_irr - actual_cost_irr
        hold.status = "settled"
        hold.settled_amount_irr = actual_cost_irr
        hold.settled_at = datetime.utcnow()
        if remainder != 0:
            await self._append_ledger(hold.user_id, "settle", remainder,
                                      note=f"settle release {request_id}",
                                      ref_type="hold", ref_id=request_id)
        # (the consumed portion stays deducted from topup)
        await self.db.commit()
        await self.db.refresh(hold)
        return hold

    async def release(self, request_id: str) -> Hold:
        hold = await self.db.scalar(select(Hold).where(Hold.request_id == request_id))
        if not hold or hold.status != "active":
            raise ValueError("hold not active / not found")
        hold.status = "released"
        hold.settled_at = datetime.utcnow()
        # full refund of the hold
        await self._append_ledger(hold.user_id, "release", hold.hold_amount_irr,
                                  note=f"release {request_id}", ref_type="hold", ref_id=request_id)
        await self.db.commit()
        await self.db.refresh(hold)
        return hold
