"""Simple in-memory per-user concurrency limiter for chat.

Prevents one user from exhausting 9Router with 1000 parallel streams.
For production, use Redis (already in stack) — this is a DEV-grade guard.
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict

MAX_CONCURRENT_PER_USER = 3
WINDOW = 60  # seconds

_user_active = defaultdict(int)
_lock = asyncio.Lock()


async def acquire(user_id: int) -> bool:
    async with _lock:
        if _user_active[user_id] < MAX_CONCURRENT_PER_USER:
            _user_active[user_id] += 1
            return True
        return False


async def release(user_id: int):
    async with _lock:
        _user_active[user_id] = max(0, _user_active[user_id] - 1)
