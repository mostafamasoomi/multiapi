"""Minimal signed API-key auth for multiapi.

Key format:  <user_id>.<hmac_hex>
where hmac = HMAC_SHA256(MASTER_SECRET, user_id)
Client sends:  Authorization: Bearer <user_...hex>

This is DEV-grade: rotate MASTER_SECRET in prod, store per-user keys in DB.
"""
import hmac, hashlib, os
from fastapi import HTTPException

MASTER_SECRET = os.getenv("MASTER_SECRET", "")
if not MASTER_SECRET:
    raise RuntimeError("SECURITY: MASTER_SECRET env var is empty. Refusing to boot.")


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
