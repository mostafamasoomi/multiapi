"""Referral router: stats and referral links."""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.routers.auth import _get_user_id

router = APIRouter(prefix="/api", tags=["referral"])


def _generate_referral_code(user_id: int) -> str:
    """Generate a deterministic 6-char alphanumeric referral code from user ID."""
    digest = hashlib.sha256(f"multiapi-ref-{user_id}".encode()).hexdigest()
    # Take first 6 uppercase chars from hex (gives A-F0-9, but good enough)
    code = digest[:6].upper()
    return code


@router.get("/referral/stats")
async def referral_stats(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Return referral stats for the current user."""
    code = _generate_referral_code(user_id)
    return {
        "total_referrals": 0,
        "referral_code": code,
        "referral_link": f"https://multiapi.ir/ref/{code}",
        "earnings": 0,
    }
