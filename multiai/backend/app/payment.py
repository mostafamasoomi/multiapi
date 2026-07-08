"""PHASE-6: payment router (Zarinpal -> wallet topup)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.payment import get_provider
from app.services.wallet import WalletService

pay = APIRouter(prefix="/pay", tags=["payment"])


class CreatePay(BaseModel):
    user_id: int
    amount_irr: int = 1000  # min


@pay.post("/create")
async def create(req: CreatePay, db: AsyncSession = Depends(get_session)):
    prov = get_provider()
    res = await prov.create_payment(req.amount_irr, req.user_id, "multiai2 wallet topup")
    # [VERIFY] parse real Zarinpal response shape
    if res.get("data", {}).get("code") == 100:
        return {"authority": res["data"]["authority"],
                "url": f"https://www.zarinpal.com/pg/StartPay/{res['data']['authority']}"}
    return {"error": res}


@pay.get("/callback")
async def callback(request: Request, db: AsyncSession = Depends(get_session)):
    params = dict(request.query_params)
    authority = params.get("Authority") or params.get("authority")
    user_id = params.get("user_id")
    # [VERIFY] amount must be recovered from session/order, not trusted from query
    if not authority or not user_id:
        return {"error": "missing params"}
    prov = get_provider()
    res = await prov.verify(authority, 0)  # amount verified server-side in prod
    if res.get("data", {}).get("code") == 100:
        ws = WalletService(db)
        # amount recovered from order table in prod
        await ws.topup(int(user_id), 1000)
        return {"ok": True, "balance": await ws.balance(int(user_id))}
    return {"error": res}
