"""User-facing auth router: register, login, logout, sessions, /me.

Phase 3: bcrypt passwords, DB-backed tokens with rotation/revocation,
HttpOnly cookie support, Persian validation messages.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import User, Wallet
from app.auth import (
    hash_password,
    verify_password,
    verify_key,
    create_db_token,
    revoke_all_user_tokens,
    revoke_token_by_hash,
    _hash_token,
)
from app.services.wallet import WalletService

router = APIRouter(prefix="/api", tags=["auth"])

IS_PROD = os.getenv("ENV", "dev") == "prod"

# ── Rate limiting (simple in-memory, per-IP) ──────────────────────────────────
_rate_limit_store: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 60       # seconds
_RATE_LIMIT_MAX = 10           # requests per window per IP
_RATE_LIMIT_AUTH = 5           # stricter for login/register


def _check_rate_limit(ip: str, max_req: int = _RATE_LIMIT_MAX) -> None:
    """Simple sliding-window rate limiter."""
    import time
    now = time.time()
    if ip not in _rate_limit_store:
        _rate_limit_store[ip] = []
    # Remove old entries
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[ip]) >= max_req:
        raise HTTPException(429, "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.")
    _rate_limit_store[ip].append(now)


# ── Request schemas ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str | None = None

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or len(v) < 5:
            raise ValueError("ایمیل معتبر نیست")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("رمز عبور باید حداقل ۶ کاراکتر باشد")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return v.strip().lower()


class TokenRevokeRequest(BaseModel):
    token_hash: str


# ── Helper ─────────────────────────────────────────────────────────────────────

async def _get_user_id(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
) -> int:
    """Extract user_id from API key. Central dependency for all protected routes."""
    api_key = (authorization or "").replace("Bearer ", "")
    return await verify_key(api_key, db)


# ── Register ───────────────────────────────────────────────────────────────────

@router.post("/auth/register")
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_session)):
    """Register new user with email + password. Returns DB-backed API token."""
    _check_rate_limit(request.client.host if request.client else "unknown", _RATE_LIMIT_AUTH)

    # Check if email already exists
    existing = await db.scalar(select(User).where(User.email == req.email))
    if existing:
        raise HTTPException(409, "این ایمیل قبلاً ثبت شده است")

    # Create user with hashed password
    user = User(
        email=req.email,
        username=req.username,
        password_hash=hash_password(req.password),
        status="active",
    )
    db.add(user)
    await db.flush()

    # Create wallet
    wallet = Wallet(user_id=user.id, balance_irr=0)
    db.add(wallet)
    await db.commit()
    await db.refresh(user)

    # Generate DB-backed token
    api_key = await create_db_token(db, user.id, name="Web Panel")

    # Set HttpOnly cookie
    resp = JSONResponse(
        content={
            "user_id": user.id,
            "api_key": api_key,
            "email": user.email,
            "balance_irr": 0,
            "message": "ثبت‌نام با موفقیت انجام شد",
        },
        status_code=201,
    )
    resp.set_cookie(
        key="api_key",
        value=api_key,
        httponly=True,
        samesite="lax",
        secure=IS_PROD,
        max_age=30 * 24 * 3600,
        path="/",
    )
    return resp


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_session)):
    """Login with email + password. Returns DB-backed API token."""
    _check_rate_limit(request.client.host if request.client else "unknown", _RATE_LIMIT_AUTH)

    user = await db.scalar(select(User).where(User.email == req.email))
    if not user:
        # Don't leak whether email exists
        raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است")

    # Check password
    if not user.password_hash:
        # Legacy user without password — fall back to HMAC-derived password
        import hashlib, hmac
        from app.auth import MASTER_SECRET
        expected = hmac.HMAC(MASTER_SECRET.encode(), req.email.encode(),
                             hashlib.sha256).hexdigest()[:16]
        if req.password != expected:
            raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است")
        # Migrate to bcrypt
        user.password_hash = hash_password(req.password)
        await db.commit()
    elif not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است")

    if user.status != "active":
        raise HTTPException(403, "حساب کاربری شما غیرفعال شده است")

    # Generate fresh token
    api_key = await create_db_token(db, user.id, name="Web Panel")

    ws = WalletService(db)
    balance = await ws.balance(user.id)

    data = {
        "user_id": user.id,
        "api_key": api_key,
        "email": user.email,
        "balance_irr": balance,
    }

    resp = JSONResponse(content=data)
    resp.set_cookie(
        key="api_key",
        value=api_key,
        httponly=True,
        samesite="lax",
        secure=IS_PROD,
        max_age=30 * 24 * 3600,
        path="/",
    )
    return resp


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/auth/logout")
async def logout(
    request: Request,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Logout: revoke current token, clear cookie."""
    # Revoke the current token
    auth_header = request.headers.get("authorization", "")
    api_key = auth_header.replace("Bearer ", "")
    if api_key and "." not in api_key:
        await revoke_token_by_hash(db, _hash_token(api_key))

    resp = JSONResponse({"message": "با موفقیت خارج شدید"})
    resp.delete_cookie("api_key", path="/")
    return resp


# ── Logout all sessions ────────────────────────────────────────────────────────

@router.post("/auth/logout-all")
async def logout_all(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Revoke ALL user tokens, clear cookie."""
    count = await revoke_all_user_tokens(db, user_id)
    resp = JSONResponse({"message": f"همه نشست‌ها ({count} مورد) بسته شدند"})
    resp.delete_cookie("api_key", path="/")
    return resp


# ── /me — current user profile ─────────────────────────────────────────────────

@router.get("/me")
async def me(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Get current user profile + wallet balance."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")

    ws = WalletService(db)
    balance = await ws.balance(user_id)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "phone": user.phone,
        "status": user.status,
        "plan": str(user.plan_id) if user.plan_id is not None else "free",
        "plan_id": user.plan_id,
        "balance_irr": balance,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "daily_spend_used_irr": user.daily_spend_used_irr,
        "daily_spend_cap_irr": user.daily_spend_cap_irr,
    }


# ── /profile — update profile ──────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    phone: str | None = None

@router.put("/profile")
async def update_profile(
    body: ProfileUpdate,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Update current user profile (phone)."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")

    if body.phone is not None:
        user.phone = body.phone

    await db.commit()
    return {"message": "پروفایل با موفقیت بروزرسانی شد"}


# ── /change-password ──────────────────────────────────────────────────────────

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Change current user password."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "کاربر یافت نشد")

    if not user.password_hash:
        raise HTTPException(400, "رمز عبور قبلی تنظیم نشده است")

    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(400, "رمز عبور فعلی اشتباه است")

    if len(body.new_password) < 8:
        raise HTTPException(400, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد")

    user.password_hash = hash_password(body.new_password)
    await db.commit()

    return {"message": "رمز عبور با موفقیت تغییر کرد"}


# ── Public models catalog ──────────────────────────────────────────────────────

@router.get("/models")
async def list_models_public(db: AsyncSession = Depends(get_session)):
    """Public models list (no auth needed)."""
    from app.models import ModelAlias
    rows = await db.scalars(select(ModelAlias).where(
        ModelAlias.is_active == True, ModelAlias.auto_disabled == False
    ))
    return [
        {
            "alias": m.alias,
            "tier": m.tier,
            "active": m.is_active,
            "auto_disabled": m.auto_disabled,
            "free_tier_eligible": m.free_tier_eligible,
            "context_window": m.context_window,
        }
        for m in rows
    ]