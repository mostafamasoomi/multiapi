"""API Keys management router — CRUD for UserApiToken."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.routers.auth import _get_user_id
from app.auth import create_db_token, revoke_token_by_hash, _hash_token
from app.models.orm import UserApiToken

router = APIRouter(prefix="/api", tags=["api-keys"])


class CreateApiKeyRequest(BaseModel):
    name: str
    scope: str = "full"  # full | read_only


@router.get("/me/api-keys")
async def list_api_keys(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """List all API keys for the current user (active + revoked)."""
    rows = await db.execute(
        select(UserApiToken)
        .where(UserApiToken.user_id == user_id)
        .order_by(UserApiToken.created_at.desc())
    )
    keys = rows.scalars().all()
    return [
        {
            "id": str(k.id),
            "name": k.name or "Unnamed",
            "prefix": k.token_hash[:8] + "...",
            "scope": k.scope,
            "status": "revoked" if k.revoked else "active",
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in keys
    ]


@router.post("/me/api-keys")
async def create_api_key(
    body: CreateApiKeyRequest,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Create a new API key. Returns the raw key (show once only)."""
    if not body.name or len(body.name.strip()) == 0:
        raise HTTPException(400, "نام کلید الزامی است")

    raw_token = await create_db_token(
        db, user_id, name=body.name.strip(), expires_days=None  # no expiry
    )

    # Fetch the created token to get its id
    token_hash = _hash_token(raw_token)
    row = await db.scalar(
        select(UserApiToken).where(UserApiToken.token_hash == token_hash)
    )

    return {
        "id": str(row.id) if row else "0",
        "name": body.name.strip(),
        "prefix": raw_token[:8] + "...",
        "full_key": raw_token,  # shown once only!
        "scope": body.scope,
        "status": "active",
        "last_used_at": None,
        "expires_at": None,
        "created_at": row.created_at.isoformat() if row and row.created_at else None,
    }


@router.delete("/me/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Revoke (delete) an API key."""
    row = await db.scalar(
        select(UserApiToken).where(
            UserApiToken.id == key_id,
            UserApiToken.user_id == user_id,
        )
    )
    if not row:
        raise HTTPException(404, "کلید یافت نشد")
    if row.revoked:
        return {"ok": True, "message": "کلید قبلاً حذف شده بود"}

    row.revoked = True
    await db.commit()
    return {"ok": True, "message": "کلید با موفقیت حذف شد"}
