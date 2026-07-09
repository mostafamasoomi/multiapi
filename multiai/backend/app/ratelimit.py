"""Redis-based per-user concurrency limiter for chat.

Replaces in-memory version. Survives restarts, works across workers.
Falls back to in-memory if Redis is unavailable (dev mode).
"""
from __future__ import annotations

import asyncio
import os
import logging

logger = logging.getLogger(__name__)

MAX_CONCURRENT_PER_USER = 3

# Try Redis, fallback to in-memory
_redis = None
_use_redis = False
_lock = asyncio.Lock()
_user_active: dict[int, int] = {}

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")


async def _get_redis():
    global _redis, _use_redis
    if _redis is not None:
        return _redis
    try:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True, socket_timeout=2)
        await _redis.ping()
        _use_redis = True
        logger.info("Rate limiter: using Redis")
        return _redis
    except Exception as e:
        logger.warning(f"Rate limiter: Redis unavailable ({e}), falling back to in-memory")
        _use_redis = False
        return None


async def acquire(user_id: int) -> bool:
    """Try to acquire a concurrency slot for this user."""
    r = await _get_redis()
    if r and _use_redis:
        try:
            key = f"ratelimit:concurrent:{user_id}"
            current = await r.get(key)
            current = int(current) if current else 0
            if current < MAX_CONCURRENT_PER_USER:
                pipe = r.pipeline()
                pipe.incr(key)
                pipe.expire(key, 300)  # auto-cleanup after 5 min
                await pipe.execute()
                return True
            return False
        except Exception:
            pass
    # Fallback: in-memory
    async with _lock:
        if _user_active.get(user_id, 0) < MAX_CONCURRENT_PER_USER:
            _user_active[user_id] = _user_active.get(user_id, 0) + 1
            return True
        return False


async def release(user_id: int):
    """Release a concurrency slot for this user."""
    r = await _get_redis()
    if r and _use_redis:
        try:
            key = f"ratelimit:concurrent:{user_id}"
            val = await r.decr(key)
            if val < 0:
                await r.delete(key)
            return
        except Exception:
            pass
    # Fallback: in-memory
    async with _lock:
        _user_active[user_id] = max(0, _user_active.get(user_id, 0) - 1)
