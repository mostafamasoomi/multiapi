"""Backend API client for Telegram bot.

Communicates with the FastAPI backend via HTTP.
"""
from __future__ import annotations

import httpx


class BackendAPI:
    def __init__(self, base_url: str, internal_token: str = ""):
        self.base = base_url.rstrip("/")
        self.headers = {"Content-Type": "application/json"}
        if internal_token:
            self.headers["X-Internal-Token"] = internal_token

    async def _get(self, path: str, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(f"{self.base}{path}", headers=self.headers, **kwargs)
            r.raise_for_status()
            return r.json()

    async def _post(self, path: str, json: dict = None, **kwargs) -> dict:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{self.base}{path}", headers=self.headers,
                             json=json, **kwargs)
            r.raise_for_status()
            return r.json()

    # ── Auth ───────────────────────────────────────────────────────────────

    async def register_telegram(self, telegram_id: int, username: str) -> dict:
        """Register or get existing Telegram user."""
        return await self._post("/admin/users/register-telegram", json={
            "telegram_id": str(telegram_id),
            "username": username,
        })

    # ── User ───────────────────────────────────────────────────────────────

    async def get_me(self, telegram_id: int) -> dict:
        """Get user info + balance."""
        return await self._get(f"/api/me?telegram_id={telegram_id}")

    async def get_models(self) -> list:
        """Get available models."""
        return await self._get("/api/models")

    # ── Chat ───────────────────────────────────────────────────────────────

    async def chat_completion(self, model: str, messages: list,
                              user_id: int = 0) -> dict:
        """Non-streaming chat completion (for inline mode)."""
        # Use admin endpoint with internal token
        return await self._post("/v1/chat/completions", json={
            "model": model,
            "messages": messages,
            "max_tokens": 1024,
            "stream": False,
        })

    # ── Payment ────────────────────────────────────────────────────────────

    async def create_payment(self, user_id: int, amount_irr: int) -> dict:
        """Create payment link."""
        return await self._post("/pay/create", json={
            "user_id": user_id,
            "amount_irr": amount_irr,
        })
