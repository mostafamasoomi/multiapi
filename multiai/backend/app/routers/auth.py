"""User-facing auth router: register, login, /me.

Uses HMAC-signed API keys (same as internal auth).
No JWT complexity — the API key IS the auth token.
"""
from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import User, Wallet
from app.auth import MASTER_SECRET, make_key
from app.services.wallet import WalletService

router = APIRouter(prefix="/api", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    telegram_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str  # For now, password = hmac(MASTER_SECRET, email) — dev grade


def _derive_password(email: str) -> str:
    """Dev-grade: password = first 16 chars of HMAC(MASTER_SECRET, email)."""
    return hmac.HMAC(MASTER_SECRET.encode(), email.encode(),
                     hashlib.sha256).hexdigest()[:16]


def _get_user_id(authorization: str = Header(None)) -> int:
    """Extract user_id from API key."""
    api_key = (authorization or "").replace("Bearer ", "")
    if not api_key or "." not in api_key:
        raise HTTPException(status_code=401, detail="unauthorized")
    user_str, sig = api_key.split(".", 1)
    try:
        user_id = int(user_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="unauthorized")
    expected = hmac.HMAC(MASTER_SECRET.encode(), user_str.encode(),
                         hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="unauthorized")
    return user_id


@router.post("/auth/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_session)):
    """Register new user. Returns API key + initial wallet."""
    # Check if email already exists
    if req.email:
        existing = await db.scalar(select(User).where(User.email == req.email))
        if existing:
            raise HTTPException(409, "email already registered")

    # Create user
    user = User(
        email=req.email,
        username=req.username,
        telegram_id=req.telegram_id,
        status="active",
    )
    db.add(user)
    await db.flush()

    # Create wallet
    wallet = Wallet(user_id=user.id, balance_irr=0)
    db.add(wallet)
    await db.commit()
    await db.refresh(user)

    # Generate API key
    api_key = make_key(user.id)

    return {
        "user_id": user.id,
        "api_key": api_key,
        "email": user.email,
        "balance_irr": 0,
    }


@router.post("/auth/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_session)):
    """Login with email + password. Returns API key."""
    if not req.email:
        raise HTTPException(400, "email required")

    user = await db.scalar(select(User).where(User.email == req.email))
    if not user:
        raise HTTPException(401, "invalid credentials")

    # Dev-grade: password check
    expected_pw = _derive_password(req.email)
    if req.password != expected_pw:
        raise HTTPException(401, "invalid credentials")

    api_key = make_key(user.id)
    ws = WalletService(db)
    balance = await ws.balance(user.id)

    return {
        "user_id": user.id,
        "api_key": api_key,
        "email": user.email,
        "balance_irr": balance,
    }


@router.get("/me")
async def me(user_id: int = Depends(_get_user_id),
             db: AsyncSession = Depends(get_session)):
    """Get current user profile + wallet balance."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "user not found")

    ws = WalletService(db)
    balance = await ws.balance(user_id)

    return {
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
        "status": user.status,
        "plan_id": user.plan_id,
        "balance_irr": balance,
        "daily_spend_used_irr": user.daily_spend_used_irr,
        "daily_spend_cap_irr": user.daily_spend_cap_irr,
    }
