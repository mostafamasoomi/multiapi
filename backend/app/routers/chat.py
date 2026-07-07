"""PHASE-1: chat completions router — the money path.

Flow (per spec):
  User -> Backend -> 9Router -> Upstream
  1. auth -> resolve user_id
  2. resolve alias (must be in model_aliases, never trust client model list)
  3. count input tokens (tiktoken) + server-side cap max_tokens
  4. estimate cost; if balance < est*1.1 -> 402
  5. place HOLD (deduct estimated)
  6. stream from 9Router (127.0.0.1 only)
  7. on finish: read real usage -> SETTLE (release remainder)
     on drop/missing usage -> settle at FULL hold
"""
from __future__ import annotations

import json
import uuid

import tiktoken
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.schemas.chat import ChatCompletionRequest
from app.services.ninrouter import NineRouterClient
from app.services.pricing import PricingService
from app.services.wallet import WalletService

router = APIRouter(prefix="/v1", tags=["chat"])

_enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


@router.post("/chat/completions")
async def chat_completions(req: ChatCompletionRequest, request: Request,
                           db: AsyncSession = Depends(get_session)):
    # --- auth: resolve user from header (simplified; harden in prod) ---
    api_key = request.headers.get("authorization", "").replace("Bearer ", "")
    user_id = req.user_id or _resolve_user(api_key)
    if not user_id:
        return _err(401, "unauthorized")

    ps = PricingService(db)
    ws = WalletService(db)
    client = NineRouterClient()

    # resolve + cap
    from app.models import ModelAlias
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == req.model))
    if not ma or not ma.is_active or ma.auto_disabled:
        return _err(404, f"model {req.model} unavailable")
    # [COMPLIANCE-RISK] paid path must not use free/OAuth upstreams
    is_paid_request = True  # determined by plan/topup later
    if is_paid_request and ma.free_tier_eligible:
        return _err(402, "model only available on free tier until paid upstream key is wired")

    # token count + server-side cap
    input_text = "\n".join(m.content for m in req.messages)
    input_tokens = count_tokens(input_text)
    max_tokens = min(req.max_tokens or ma.max_tokens_cap, ma.max_tokens_cap)

    est_cost, _ = await ps.estimate_cost_irr(req.model, input_tokens, max_tokens)

    request_id = str(uuid.uuid4())
    try:
        await ws.place_hold(user_id, est_cost, request_id, req.model,
                            overprovision=settings.hold_overprovision)
    except Exception as e:
        if "402" in str(e):
            return _err(402, "insufficient_funds")
        raise

    async def event_stream():
        actual_in = input_tokens
        actual_out = 0
        usage = None
        try:
            async for delta, usage in client.stream_chat(req.model, {
                "messages": [m.model_dump() for m in req.messages],
                "max_tokens": max_tokens,
                "temperature": req.temperature,
            }):
                if delta:
                    actual_out += count_tokens(delta)
                    yield f"data: {json.dumps({'choices':[{'delta':{'content':delta}}]})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            pass
        finally:
            actual = None
            if usage and usage.get("completion_tokens"):
                actual_in = usage.get("prompt_tokens", actual_in)
                actual_out = usage.get("completion_tokens", actual_out)
                in_p, out_p, _, _ = await ps.sell_price_per_1m(req.model)
                actual = int((actual_in/1e6)*in_p + (actual_out/1e6)*out_p)
            await ws.settle(request_id, actual)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _resolve_user(api_key: str) -> int | None:
    # placeholder: map api_key -> user_id (implement auth in PHASE-3)
    return 1


def _err(code: int, msg: str):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=code, content={"error": msg})
