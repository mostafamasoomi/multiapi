"""Notifications router: list and mark-as-read."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Notification
from app.routers.auth import _get_user_id

router = APIRouter(prefix="/api", tags=["notifications"])


@router.get("/notifications")
async def list_notifications(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """List notifications for the current user."""
    try:
        rows = await db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return [
            {
                "id": n.id,
                "message": n.message,
                "read": n.read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in rows
        ]
    except Exception:
        # Table may not exist yet — return empty list
        return []


@router.post("/notifications/{nid}/read")
async def mark_notification_read(
    nid: int,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Mark a notification as read."""
    try:
        notif = await db.scalar(
            select(Notification).where(
                Notification.id == nid, Notification.user_id == user_id
            )
        )
        if notif:
            notif.read = True
            await db.commit()
    except Exception:
        pass
    return {"ok": True}
