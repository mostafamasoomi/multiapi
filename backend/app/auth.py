"""MultiAPI auth: HMAC-signed API keys + DB-backed tokens + bcrypt passwords.

Legacy key format:  <user_id>.<hmac_hex>
DB-backed token:    raw_token (presented once) → stored as SHA-256 hash
Password:           bcrypt hash stored in users.password_hash

Phase 3: Async verify_key, no crash on empty MASTER_SECRET, token lifecycle.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

MASTER_SECRET = os.getenv("MASTER_SECRET", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

if not MASTER_SECRET:
    print("WARNING: MASTER_SECRET env var is empty. Auth will fail until set.")
if not ADMIN_TOKEN:
    print("WARNING: ADMIN_TOKEN env var is empty. Admin auth will fail until set.")


# ── Password hashing ───────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password with bcrypt (auto-salted)."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── Token hashing ──────────────────────────────────────────────────────────────

def _hash_token(raw: str) -> str:
    """SHA-256 hex digest of a raw token."""
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_raw_token() -> str:
    """Generate a cryptographically random token string."""
    return secrets.token_hex(32)  # 64 hex chars


# ── Legacy HMAC key helpers ────────────────────────────────────────────────────

def _hmac_sign(user_id: int) -> str:
    """Sign a user_id with MASTER_SECRET."""
    return hmac.HMAC(MASTER_SECRET.encode(), str(user_id).encode(),
                     hashlib.sha256).hexdigest()


def make_key(user_id: int) -> str:
    """Generate a legacy HMAC-signed API key (dev/testing)."""
    return f"{user_id}.{_hmac_sign(user_id)}"


def _verify_legacy_key(api_key: str) -> int:
    """Verify a legacy HMAC-signed key. Returns user_id or raises 401."""
    if not MASTER_SECRET:
        raise HTTPException(status_code=503, detail="auth not configured")
    if not api_key or "." not in api_key:
        raise HTTPException(status_code=401, detail="invalid_api_key")
    user_str, sig = api_key.split(".", 1)
    try:
        user_id = int(user_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_api_key")
    expected = _hmac_sign(user_id)
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="invalid_api_key")
    return user_id


# ── Main token verification ────────────────────────────────────────────────────

async def verify_key(api_key: str, db: AsyncSession | None = None) -> int:
    """Verify an API key (legacy HMAC or DB-backed token). Returns user_id.

    Raises 401 for invalid/expired/revoked tokens.
    """
    if not api_key:
        raise HTTPException(status_code=401, detail="missing_api_key")

    # Legacy HMAC path: contains a dot
    if "." in api_key:
        return _verify_legacy_key(api_key)

    # DB-backed token path: lookup by hash
    if db is None:
        raise HTTPException(status_code=401, detail="invalid_api_key")

    from app.models.orm import UserApiToken  # late import to avoid circular deps

    token_hash = _hash_token(api_key)
    row = await db.scalar(
        select(UserApiToken).where(
            UserApiToken.token_hash == token_hash,
            UserApiToken.revoked == False,
        )
    )
    if not row:
        raise HTTPException(status_code=401, detail="invalid_api_key")

    # Check expiry
    if row.expires_at and row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="token_expired")

    # Update last_used_at
    row.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    return row.user_id


# ── Token lifecycle ────────────────────────────────────────────────────────────

async def create_db_token(
    db: AsyncSession,
    user_id: int,
    name: str = "Web Panel",
    expires_days: int | None = 30,
) -> str:
    """Create a new DB-backed token. Returns the raw token (show once)."""
    from app.models.orm import UserApiToken

    raw = generate_raw_token()
    token = UserApiToken(
        user_id=user_id,
        token_hash=_hash_token(raw),
        name=name,
        expires_at=datetime.now(timezone.utc) + timedelta(days=expires_days) if expires_days else None,
    )
    db.add(token)
    await db.commit()
    return raw


async def revoke_all_user_tokens(db: AsyncSession, user_id: int) -> int:
    """Revoke all tokens for a user. Returns count of revoked tokens."""
    from app.models.orm import UserApiToken

    result = await db.execute(
        select(UserApiToken).where(
            UserApiToken.user_id == user_id,
            UserApiToken.revoked == False,
        )
    )
    tokens = result.scalars().all()
    count = 0
    for t in tokens:
        t.revoked = True
        count += 1
    await db.commit()
    return count


async def revoke_token_by_hash(db: AsyncSession, token_hash: str) -> bool:
    """Revoke a single token by its hash. Returns True if found and revoked."""
    from app.models.orm import UserApiToken

    row = await db.scalar(
        select(UserApiToken).where(UserApiToken.token_hash == token_hash)
    )
    if row:
        row.revoked = True
        await db.commit()
        return True
    return False


# ── Admin auth ─────────────────────────────────────────────────────────────────

async def require_admin(authorization: str = Header(None)):
    """Verify admin token from Authorization header. Timing-safe comparison."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="admin auth not configured")
    token = (authorization or "").replace("Bearer ", "")
    if not token or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="admin_auth_required")