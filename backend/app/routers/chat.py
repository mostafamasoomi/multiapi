"""PHASE-0: chat completions router (OpenAI-compatible, streaming).

Flow:
  1. verify signed API key -> user_id
  2. resolve model alias (must be active, not auto_disabled)
  3. compliance gate: paid path must NOT hit free/OAuth upstreams
  4. estimate cost (fx + margin)
  5. ATOMIC hold (prepaid, never negative)
  6. stream from 9Router (127.0.0.1 only)
  7. on finish: read real usage -> SETTLE (release remainder)
     on drop/missing usage -> settle at FULL hold
"""
from __future__ import annotations

import json
import logging
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
from app.services.plan_quota import PlanQuotaService
from app.services.brakes import BrakeService
from app.models import ModelAlias
from app.auth import verify_key
from app.ratelimit import acquire, release

logger = logging.getLogger("chat")

router = APIRouter(prefix="/v1", tags=["chat"])
_enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


@router.post("/chat/completions")
async def chat_completions(req: ChatCompletionRequest, request: Request,
                           db: AsyncSession = Depends(get_session)):
    ps = PricingService(db)
    ws = WalletService(db)
    pqs = PlanQuotaService(db)
    bs = BrakeService(db)
    client = NineRouterClient()

    # Verify API key
    api_key = request.headers.get("authorization", "").replace("Bearer ", "")
    try:
        user_id = verify_key(api_key)
    except Exception:
        return _err(401, "unauthorized")

    # Resolve model alias
    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == req.model))
    if not ma or not ma.is_active or ma.auto_disabled:
        return _err(404, f"model {req.model} unavailable")

    # Compliance gate: paid path must NOT hit free/OAuth upstreams
    if ma.free_tier_eligible:
        return _err(402, "model only available on free tier until paid upstream key is wired")

    # PHASE-3: Kill switch check
    ks = await bs.global_settings("kill_switch")
    if ks.get("enabled"):
        from app.models import User
        user_check = await db.scalar(select(User).where(User.id == user_id))
        if not user_check or not user_check.plan_id:
            return _err(503, "service temporarily restricted to subscribers")

    # PHASE-2: Plan + quota check (BEFORE hold)
    try:
        user, plan, ma = await pqs.check_request(user_id, req.model, 0)
    except Exception as e:
        if hasattr(e, 'status_code'):
            return _err(e.status_code, str(e.detail) if hasattr(e, 'detail') else str(e))
        raise

    # Calculate tokens and cost
    input_text = "\n".join(m.content for m in req.messages)
    input_tokens = count_tokens(input_text)
    max_tokens = min(req.max_tokens or ma.max_tokens_cap, ma.max_tokens_cap)

    est_cost, _ = await ps.estimate_cost_irr(req.model, input_tokens, max_tokens)

    # PHASE-2: Re-check with estimated cost for spend cap
    try:
        user, plan, ma = await pqs.check_request(user_id, req.model, est_cost)
    except Exception as e:
        if hasattr(e, 'status_code'):
            return _err(e.status_code, str(e.detail) if hasattr(e, 'detail') else str(e))
        raise

    # Place hold (prepaid only)
    request_id = str(uuid.uuid4())
    try:
        await ws.place_hold(user_id, est_cost, request_id, req.model,
                            overprovision=settings.hold_overprovision)
    except Exception as e:
        if "402" in str(e):
            return _err(402, "insufficient_funds")
        raise

    # Rate limit check — MUST release hold if denied
    if not await acquire(user_id):
        await ws.release(request_id)
        return _err(429, "rate_limited: max 3 concurrent chats per user")

    # Capture values for the closure (avoid capturing request-scoped session)
    _model = req.model
    _messages = [m.model_dump() for m in req.messages]
    _temperature = req.temperature

    async def event_stream():
        actual_in = input_tokens
        actual_out = 0
        usage = None
        try:
            async for delta, usage in client.stream_chat(ma.upstream_model, {
                "messages": _messages,
                "max_tokens": max_tokens,
                "temperature": _temperature,
            }):
                if delta:
                    actual_out += count_tokens(delta)
                    yield "data: " + json.dumps({"choices": [{"delta": {"content": delta}}]}) + "\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            err_msg = str(e) or "upstream_error"
            logger.error(f"Stream error: {err_msg}")
            yield "data: " + json.dumps({"error": err_msg}) + "\n\n"
            yield "data: [DONE]\n\n"
        finally:
            # CRITICAL: Acquire FRESH session for settlement (request-scoped may be closed)
            from app.db.session import async_session
            actual = None
            try:
                if usage and usage.get("completion_tokens"):
                    actual_in = usage.get("prompt_tokens", actual_in)
                    actual_out = usage.get("completion_tokens", actual_out)
                    # Use fresh session for pricing
                    async with async_session() as settle_db:
                        settle_ps = PricingService(settle_db)
                        in_p, out_p, _, _ = await settle_ps.sell_price_per_1m(_model)
                        actual = int((actual_in / 1e6) * in_p + (actual_out / 1e6) * out_p)

                # Settle with fresh session
                async with async_session() as settle_db:
                    settle_ws = WalletService(settle_db)
                    await settle_ws.settle(request_id, actual)

                    # Record usage for quota tracking
                    if actual is not None:
                        settle_pqs = PlanQuotaService(settle_db)
                        await settle_pqs.record_usage(user_id, _model, actual, actual_in + actual_out)

                # Release rate limiter (in-memory, can use request-scoped)
                await release(user_id)
            except Exception as e:
                logger.error(f"Settlement failed for {request_id}: {e}")
                # Try to release hold on failure
                try:
                    async with async_session() as fallback_db:
                        fallback_ws = WalletService(fallback_db)
                        await fallback_ws.release(request_id)
                except Exception:
                    logger.error(f"Fallback release also failed for {request_id}")

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _err(code: int, msg: str):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=code, content={"error": msg})
