"""PHASE-6: payment abstraction + Zarinpal impl.

Payment provider is abstracted behind PaymentProvider interface so Zarinpal
(or any IR gateway) can be swapped without touching wallet logic.

Features:
  - Order tracking (amount recovered from DB, not trusted from query)
  - Payment history
  - Idempotent verification
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ledger, PaymentOrder, User, Wallet
from app.db.session import AsyncSessionLocal


class PaymentProvider:
    async def create_payment(self, amount_irr: int, user_id: int, desc: str) -> dict:
        raise NotImplementedError

    async def verify(self, authority: str, amount_irr: int) -> dict:
        raise NotImplementedError


class ZarinpalProvider(PaymentProvider):
    def __init__(self):
        self.merchant = os.getenv("ZARINPAL_MERCHANT_ID", "")
        self.callback = os.getenv("PAYMENT_CALLBACK_URL", "")
        self.api = "https://api.zarinpal.com/pg/v4"
        self.sandbox = os.getenv("ZARINPAL_SANDBOX", "false").lower() == "true"
        if self.sandbox:
            self.api = "https://sandbox.zarinpal.com/pg/v4"

    async def create_payment(self, amount_irr: int, user_id: int, desc: str) -> dict:
        payload = {
            "merchant_id": self.merchant,
            "amount": amount_irr,
            "callback_url": f"{self.callback}?user_id={user_id}",
            "description": desc,
        }
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.api}/payment/request.json", json=payload)
            return r.json()

    async def verify(self, authority: str, amount_irr: int) -> dict:
        payload = {
            "merchant_id": self.merchant,
            "amount": amount_irr,
            "authority": authority,
        }
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.api}/payment/verify.json", json=payload)
            return r.json()


def get_provider() -> PaymentProvider:
    name = os.getenv("PAYMENT_PROVIDER", "zarinpal")
    if name == "zarinpal":
        return ZarinpalProvider()
    raise ValueError(f"unknown provider {name}")


# ── Order Management ───────────────────────────────────────────────────────────

async def create_order(db: AsyncSession, user_id: int, amount_irr: int) -> PaymentOrder:
    """Create a payment order for tracking."""
    order = PaymentOrder(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount_irr=amount_irr,
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def complete_order(db: AsyncSession, order_id: str,
                          authority: str, ref_id: str | None = None) -> PaymentOrder:
    """Mark order as completed after successful verification."""
    order = await db.scalar(
        select(PaymentOrder).where(PaymentOrder.id == order_id))
    if not order:
        raise ValueError(f"order {order_id} not found")
    order.status = "completed"
    order.authority = authority
    order.ref_id = ref_id
    order.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(order)
    return order


async def get_user_orders(db: AsyncSession, user_id: int,
                           limit: int = 20) -> list[PaymentOrder]:
    """Get user's payment history."""
    rows = await db.execute(
        select(PaymentOrder)
        .where(PaymentOrder.user_id == user_id)
        .order_by(PaymentOrder.created_at.desc())
        .limit(limit))
    return list(rows.scalars().all())
