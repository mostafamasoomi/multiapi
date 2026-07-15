"""Conversations CRUD router — server-side storage for chat history."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.routers.auth import _get_user_id
from app.models.orm import Conversation

router = APIRouter(prefix="/api", tags=["conversations"])


class ConversationCreate(BaseModel):
    title: str = "چت جدید"
    model: str = ""
    messages: list[dict] = []


class ConversationUpdate(BaseModel):
    title: str | None = None
    model: str | None = None
    messages: list[dict] | None = None


@router.get("/conversations")
async def list_conversations(
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """List all conversations for the current user (newest first)."""
    rows = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(100)
    )
    convs = rows.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "model": c.model,
            "message_count": len(c.messages_json) if c.messages_json else 0,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]


@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: int,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Get a single conversation with all messages."""
    c = await db.scalar(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user_id,
        )
    )
    if not c:
        raise HTTPException(404, "مکالمه یافت نشد")
    return {
        "id": c.id,
        "title": c.title,
        "model": c.model,
        "messages": c.messages_json or [],
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.post("/conversations")
async def create_conversation(
    body: ConversationCreate,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Create a new conversation."""
    conv = Conversation(
        user_id=user_id,
        title=body.title,
        model=body.model,
        messages_json=body.messages,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {
        "id": conv.id,
        "title": conv.title,
        "model": conv.model,
        "messages": conv.messages_json or [],
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
    }


@router.put("/conversations/{conv_id}")
async def update_conversation(
    conv_id: int,
    body: ConversationUpdate,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Update a conversation (title, model, messages)."""
    c = await db.scalar(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user_id,
        )
    )
    if not c:
        raise HTTPException(404, "مکالمه یافت نشد")
    if body.title is not None:
        c.title = body.title
    if body.model is not None:
        c.model = body.model
    if body.messages is not None:
        c.messages_json = body.messages
    await db.commit()
    await db.refresh(c)
    return {
        "id": c.id,
        "title": c.title,
        "model": c.model,
        "messages": c.messages_json or [],
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: int,
    user_id: int = Depends(_get_user_id),
    db: AsyncSession = Depends(get_session),
):
    """Delete a conversation."""
    c = await db.scalar(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user_id,
        )
    )
    if not c:
        raise HTTPException(404, "مکالمه یافت نشد")
    await db.delete(c)
    await db.commit()
    return {"ok": True, "message": "مکالمه حذف شد"}
