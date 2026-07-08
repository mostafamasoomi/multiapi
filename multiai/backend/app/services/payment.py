"""PHASE-6: payment abstraction + Zarinpal impl.

Payment provider is abstracted behind PaymentProvider interface so Zarinpal
(or any IR gateway) can be swapped without touching wallet logic.
[VERIFY] Zarinpal API endpoints/keys must be confirmed against real docs before prod.
Compliance: topups are IRR-only; upstream is paid in USD — FX handled at pricing time.
"""
from __future__ import annotations

import os

import httpx


class PaymentProvider:
    async def create_payment(self, amount_irr: int, user_id: int, desc: str) -> dict:
        raise NotImplementedError

    async def verify(self, authority: str) -> dict:
        raise NotImplementedError


class ZarinpalProvider(PaymentProvider):
    def __init__(self):
        self.merchant = os.getenv("ZARINPAL_MERCHANT_ID", "")
        self.callback = os.getenv("PAYMENT_CALLBACK_URL", "")
        self.api = "https://api.zarinpal.com/pg/v4"

    async def create_payment(self, amount_irr: int, user_id: int, desc: str) -> dict:
        # Zarinpal amount is in Rials (already IRR minor units here)
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
        payload = {"merchant_id": self.merchant, "amount": amount_irr, "authority": authority}
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.api}/payment/verify.json", json=payload)
            return r.json()


def get_provider() -> PaymentProvider:
    name = os.getenv("PAYMENT_PROVIDER", "zarinpal")
    if name == "zarinpal":
        return ZarinpalProvider()
    raise ValueError(f"unknown provider {name}")
