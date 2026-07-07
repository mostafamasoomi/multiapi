"""PHASE-5: aiogram 3.x Telegram bot.

Minimal but functional: /start, /balance, /models, /chat.
Wallet + 9Router path reused from backend services (same DB).
[VERIFY] Bot token must be set in env TELEGRAM_BOT_TOKEN.
"""
from __future__ import annotations

import asyncio
import json

from aiogram import Bot, Router, F
from aiogram.filters import Command
from aiogram.types import Message

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.wallet import WalletService

router = Router()


@router.message(Command("start"))
async def start(m: Message):
    await m.answer("سلام! من بات multiai2 هستم.\n/balance کیف پول\n/models لیست مدل‌ها\n/chat <پیام> برای چت")


@router.message(Command("balance"))
async def balance(m: Message):
    async with AsyncSessionLocal() as db:
        ws = WalletService(db)
        uid = m.from_user.id
        bal = await ws.balance(uid)
        await m.answer(f"موجودی شما: {bal:,} ریال")


@router.message(Command("models"))
async def models(m: Message):
    from app.models import ModelAlias
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        rows = await db.scalars(select(ModelAlias).where(ModelAlias.is_active.is_(True)))
        txt = "\n".join(f"• {r.alias}" for r in rows)
        await m.answer(f"مدل‌های فعال:\n{txt}")


@router.message(Command("chat"))
async def chat(m: Message):
    await m.answer("🚧 چت از بات در PHASE-5 پایه است؛ مسیر کامل در PHASE-1 backend ست.")


async def main():
    if not settings.telegram_bot_token:
        print("TELEGRAM_BOT_TOKEN not set — bot disabled")
        return
    bot = Bot(token=settings.telegram_bot_token)
    await bot.delete_webhook(drop_pending_updates=True)
    from aiogram import Dispatcher
    dp = Dispatcher()
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
