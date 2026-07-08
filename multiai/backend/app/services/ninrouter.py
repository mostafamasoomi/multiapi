"""PHASE-1: 9Router client — INTERNAL ONLY (127.0.0.1).

The backend is 9Router's ONLY client. No user key ever reaches 9Router.
Streams OpenAI-compatible chat completions; yields usage chunks.

[VERIFY] Exact SSE usage field names from 9Router. OpenAI format uses
  chunk.choices[].delta and final chunk.usage = {prompt_tokens, completion_tokens}.
We read usage from the FINAL event; if absent, caller settles at full hold.
"""
from __future__ import annotations

import json
import os

import httpx

from app.core.config import settings


class NineRouterClient:
    def __init__(self):
        assert settings.ninrouter_is_internal, "9Router must be internal-only"
        self.base = settings.ninrouter_base_url.rstrip("/")
        self.mock = os.getenv("MOCK_MODE", "false").lower() == "true"
        self.headers = {"Content-Type": "application/json"}
        if settings.ninrouter_api_key:
            self.headers["Authorization"] = f"Bearer {settings.ninrouter_api_key}"

    async def stream_chat(self, alias: str, payload: dict, timeout: float = 120.0):
        """Yield (text_delta, usage_dict_or_None) per SSE event."""
        if self.mock:
            yield "[MOCK] 9Router offline — this is a test response for beta.", {
                "prompt_tokens": 5, "completion_tokens": 12}
            return
        body = {
            "model": alias,
            "messages": payload["messages"],
            "stream": True,
            "temperature": payload.get("temperature", 1.0),
        }
        if payload.get("max_tokens"):
            body["max_tokens"] = payload["max_tokens"]
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST", f"{self.base}/v1/chat/completions",
                headers=self.headers, json=body,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        return
                    try:
                        evt = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    delta = ""
                    if evt.get("choices"):
                        delta = evt["choices"][0].get("delta", {}).get("content", "")
                    usage = evt.get("usage")  # present on final chunk
                    yield delta, usage
