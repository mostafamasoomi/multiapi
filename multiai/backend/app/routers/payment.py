"""PHASE-6: payment router (Zarinpal -> wallet topup).

Features:
  - Order tracking (amount recovered from DB)
  - Idempotent verification
  - Payment history
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import PaymentOrder
from app.services.payment import (
    get_provider, create_order, complete_order, get_user_orders
)
from app.services.wallet import WalletService

pay = APIRouter(prefix="/pay", tags=["payment"])
router = pay  # alias for main.py include_router(payment.router)


class CreatePay(BaseModel):
    user_id: int
    amount_irr: int = 10000  # min


@pay.post("/create")
async def create(req: CreatePay, db: AsyncSession = Depends(get_session)):
    """Create payment link with order tracking."""
    if req.amount_irr < 10000:
        return {"error": "minimum topup is 10,000 IRR"}

    # Create order in DB
    order = await create_order(db, req.user_id, req.amount_irr)

    # Create Zarinpal payment
    prov = get_provider()
    res = await prov.create_payment(req.amount_irr, req.user_id,
                                     f"multiapi wallet topup #{order.id[:8]}")

    if res.get("data", {}).get("code") == 100:
        authority = res["data"]["authority"]
        # Update order with authority
        order.authority = authority
        await db.commit()

        return {
            "order_id": order.id,
            "authority": authority,
            "url": f"https://www.zarinpal.com/pg/StartPay/{authority}",
            "amount_irr": req.amount_irr,
        }
    else:
        order.status = "failed"
        await db.commit()
        return {"error": res.get("errors", [{}]), "order_id": order.id}


@pay.get("/callback")
async def callback(request: Request, db: AsyncSession = Depends(get_session)):
    """Payment callback — verify and topup wallet."""
    params = dict(request.query_params)
    authority = params.get("Authority") or params.get("authority")
    status = params.get("Status")
    user_id = params.get("user_id")

    if not authority or not user_id:
        return {"error": "missing params"}

    # Find order by authority
    order = await db.scalar(
        select(PaymentOrder).where(PaymentOrder.authority == authority))
    if not order:
        return {"error": "order not found"}

    # Idempotent: skip if already completed
    if order.status == "completed":
        ws = WalletService(db)
        balance = await ws.balance(order.user_id)
        return {"ok": True, "already_verified": True, "balance": balance}

    # Verify with Zarinpal
    prov = get_provider()
    res = await prov.verify(authority, order.amount_irr)

    if res.get("data", {}).get("code") == 100:
        # Success — topup wallet
        ref_id = str(res["data"].get("ref_id", ""))
        await complete_order(db, order.id, authority, ref_id)

        ws = WalletService(db)
        await ws.topup(order.user_id, order.amount_irr,
                       note=f"payment #{order.id[:8]} ref:{ref_id}")
        balance = await ws.balance(order.user_id)

        return {"ok": True, "order_id": order.id, "balance": balance}
    else:
        order.status = "failed"
        await db.commit()
        return {"error": res.get("errors", [{}]), "order_id": order.id}


@pay.get("/history/{user_id}")
async def payment_history(user_id: int, limit: int = 20,
                          db: AsyncSession = Depends(get_session)):
    """Get user's payment history."""
    orders = await get_user_orders(db, user_id, limit)
    return [
        {"id": o.id, "amount_irr": o.amount_irr, "status": o.status,
         "created_at": o.created_at.isoformat() if o.created_at else None,
         "completed_at": o.completed_at.isoformat() if o.completed_at else None}
        for o in orders
    ]
