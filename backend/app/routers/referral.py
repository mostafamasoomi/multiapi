"""Referral router: stats and referral links."""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.orm import Referral, User
from app.routers.auth import _get_user_id

router = APIRouter(prefix="/api", tags=["referral"])


def _generate_referral_code(user_id: int) -> str:
    """Generate a deterministic 6-char alphanumeric referral code from user ID."""
    digest = hashlib.sha256(f"multiapi-ref-{user_id}".encode()).hexdigest()
    code = digest[:6].upper()
    return code


@router.get("/referral/stats")
async def referral_stats(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Return referral stats for the current user."""
    code = _generate_referral_code(user_id)

    # Count referrals
    count_result = await db.execute(
        select(func.count()).select_from(Referral).where(Referral.referrer_user_id == user_id)
    )
    total_referrals = count_result.scalar() or 0

    # Sum earnings
    earnings_result = await db.execute(
        select(func.coalesce(func.sum(Referral.earnings_irr), 0)).where(Referral.referrer_user_id == user_id)
    )
    earnings = earnings_result.scalar() or 0

    return {
        "total_referrals": total_referrals,
        "referral_code": code,
        "referral_link": f"https://multiapi.ir/ref/{code}",
        "earnings": earnings,
    }


@router.get("/referral/validate/{code}")
async def validate_referral_code(code: str, db: AsyncSession = Depends(get_session)):
    """Validate a referral code and return the referrer user ID."""
    # Find user whose generated code matches
    all_users = await db.execute(select(User.id))
    for (uid,) in all_users:
        if _generate_referral_code(uid) == code:
            return {"valid": True, "referrer_id": uid}
    return {"valid": False}
