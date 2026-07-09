"""Minimal signed API-key auth for multiapi.

Key format:  <user_id>.<hmac_hex>
where hmac = HMAC_SHA256(MASTER_SECRET, user_id)
Client sends:  Authorization: Bearer <user_...hex>

This is DEV-grade: rotate MASTER_SECRET in prod, store per-user keys in DB.
"""
import hmac
import hashlib
import os
import secrets

from fastapi import HTTPException, Header

MASTER_SECRET = os.getenv("MASTER_SECRET", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

if not MASTER_SECRET:
    raise RuntimeError("SECURITY: MASTER_SECRET env var is empty. Refusing to boot.")


# ── API Key Auth ───────────────────────────────────────────────────────────────

def verify_key(api_key: str) -> int:
    """Return user_id if valid, else raise 401."""
    if not api_key or "." not in api_key:
        raise HTTPException(status_code=401, detail="invalid_api_key")
    user_str, sig = api_key.split(".", 1)
    try:
        user_id = int(user_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_api_key")
    expected = hmac.HMAC(MASTER_SECRET.encode(), user_str.encode(),
                         hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="invalid_api_key")
    return user_id


def make_key(user_id: int) -> str:
    """Helper to generate a key (dev/testing)."""
    return f"{user_id}." + hmac.HMAC(MASTER_SECRET.encode(), str(user_id).encode(),
                                     hashlib.sha256).hexdigest()


# ── Admin Auth ─────────────────────────────────────────────────────────────────

async def require_admin(authorization: str = Header(None)):
    """Verify admin token from Authorization header. Timing-safe comparison."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="admin auth not configured")
    token = (authorization or "").replace("Bearer ", "")
    if not token or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="admin_auth_required")
