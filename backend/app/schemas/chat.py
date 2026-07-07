"""PHASE-1: pydantic schemas for chat + wallet."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str  # alias, e.g. kr/claude-sonnet-4.5
    messages: list[ChatMessage]
    max_tokens: int | None = Field(default=None, ge=1, le=200000)
    temperature: float | None = 1.0
    stream: bool = True
    user_id: int | None = None  # backend-supplied from auth, never trust client model


class WalletTopupRequest(BaseModel):
    user_id: int
    amount_irr: int = Field(ge=1000)  # min topup in IRR


class WalletBalance(BaseModel):
    user_id: int
    balance_irr: int
    currency: str
