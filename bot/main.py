"""PHASE-5: Telegram bot (aiogram 3.x).

Architecture:
  User → Telegram Bot → Backend API → 9Router → Provider

Bot handles:
  - /start, /help — welcome + instructions
  - /balance — show wallet balance
  - /models — list available models
  - /usage — show today's usage
  - /topup — get payment link
  - Inline mode — chat completions via inline queries
"""
from __future__ import annotations

import os
import sys
import logging
from typing import Optional

from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    Message, InlineQuery, InlineQueryResultArticle, InputTextMessageContent,
    CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup
)
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

# Add parent dir for backend imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_client import BackendAPI

# ── Config ─────────────────────────────────────────────────────────────────────

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
BACKEND_INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("multiapi-bot")

# ── FSM States ─────────────────────────────────────────────────────────────────

class TopupStates(StatesGroup):
    waiting_for_amount = State()

# ── Router ─────────────────────────────────────────────────────────────────────

router = Router()
api = BackendAPI(BACKEND_URL, BACKEND_INTERNAL_TOKEN)


# ── /start ─────────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Welcome message + registration."""
    user_id = message.from_user.id
    username = message.from_user.username

    try:
        result = await api.register_telegram(user_id, username)
        balance = result.get("balance_irr", 0)
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        balance = 0

    text = (
        f"⚡ **به multiapi خوش آمدید!**\n\n"
        f"دروازه هوش مصنوعی فارسی\n"
        f"از یک دروازه واحد به همه مدلها دسترسی داشته باشید.\n\n"
        f"**موجودی شما:** {balance:,} ریال\n\n"
        f"**دستورات:**\n"
        f"🔹 /models — لیست مدلها\n"
        f"🔹 /balance — موجودی و مصرف\n"
        f"🔹 /topup — شارژ کیف پول\n"
        f"🔹 /help — راهنما\n\n"
        f"**استفاده از inline:**\n"
        f"در هر چت بنویسید: `@multiapi_bot <پیام>`"
    )
    await message.answer(text, parse_mode=ParseMode.MARKDOWN)


# ── /help ──────────────────────────────────────────────────────────────────────

@router.message(Command("help"))
async def cmd_help(message: Message):
    text = (
        "⚡ **راهنمای multiapi**\n\n"
        "**دستورات:**\n"
        "🔹 /start — شروع و ثبت‌نام\n"
        "🔹 /models — لیست مدلها\n"
        "🔹 /balance — موجودی و مصرف امروز\n"
        "🔹 /topup — شارژ کیف پول\n"
        "🔹 /usage — جزئیات مصرف\n"
        "🔹 /help — این راهنما\n\n"
        "**:inline mode:**\n"
        "در هر چت بنویسید:\n"
        "`@multiapi_bot model_name پیام شما`\n\n"
        "**مثال:**\n"
        "`@multiapi_bot deepseek-chat سلام، حالت چطوره؟`\n\n"
        "**نکته:** ابتدا باید با /start ثبت‌نام کنید."
    )
    await message.answer(text, parse_mode=ParseMode.MARKDOWN)


# ── /balance ───────────────────────────────────────────────────────────────────

@router.message(Command("balance"))
async def cmd_balance(message: Message):
    user_id = message.from_user.id
    try:
        data = await api.get_me(user_id)
        balance = data.get("balance_irr", 0)
        used = data.get("daily_spend_used_irr", 0)
        cap = data.get("daily_spend_cap_irr", 0)

        text = (
            f"💰 **کیف پول شما**\n\n"
            f"**موجودی:** {balance:,} ریال\n"
            f"**مصرف امروز:** {used:,} ریال\n"
        )
        if cap > 0:
            pct = min(100, (used / cap) * 100)
            text += f"**سقف روزانه:** {cap:,} ریال ({pct:.0f}%)\n"
        else:
            text += "**سقف روزانه:** ∞\n"

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💳 شارژ کیف پول", callback_data="topup")]
        ])
        await message.answer(text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
    except Exception as e:
        await message.answer(f"❌ خطا در دریافت اطلاعات: {e}")


# ── /models ────────────────────────────────────────────────────────────────────

@router.message(Command("models"))
async def cmd_models(message: Message):
    try:
        models = await api.get_models()
        if not models:
            await message.answer("⚠️ مدلی موجود نیست.")
            return

        tiers = {"pro": [], "standard": [], "mini": []}
        for m in models:
            t = m.get("tier", "standard")
            if t not in tiers:
                t = "standard"
            if m.get("active") and not m.get("auto_disabled"):
                tiers[t].append(m)

        tier_labels = {"pro": "🔥 حرفه‌ای", "standard": "⚡ استاندارد", "mini": "💡 سبک"}
        lines = ["📋 **لیست مدلها**\n"]

        for tier, items in tiers.items():
            if items:
                lines.append(f"\n**{tier_labels[tier]}:**")
                for m in items:
                    lines.append(f"  • `{m['alias']}`")

        text = "\n".join(lines)
        text += "\n\n💡 برای استفاده در inline بنویسید:\n`@multiapi_bot model_name پیام`"

        await message.answer(text, parse_mode=ParseMode.MARKDOWN)
    except Exception as e:
        await message.answer(f"❌ خطا: {e}")


# ── /usage ─────────────────────────────────────────────────────────────────────

@router.message(Command("usage"))
async def cmd_usage(message: Message):
    user_id = message.from_user.id
    try:
        data = await api.get_me(user_id)
        usage = data.get("token_usage_by_model", [])

        if not usage:
            await message.answer("📊 هنوز مصرفی ثبت نشده.")
            return

        lines = ["📊 **مصرف امروز شما:**\n"]
        for u in usage:
            model = u.get("model_alias_id", "?")
            tokens = u.get("used_tokens", 0)
            lines.append(f"  • `{model}`: {tokens:,} توکن")

        await message.answer("\n".join(lines), parse_mode=ParseMode.MARKDOWN)
    except Exception as e:
        await message.answer(f"❌ خطا: {e}")


# ── /topup ─────────────────────────────────────────────────────────────────────

@router.message(Command("topup"))
async def cmd_topup(message: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="10,000 ریال", callback_data="topup:10000"),
            InlineKeyboardButton(text="50,000 ریال", callback_data="topup:50000"),
        ],
        [
            InlineKeyboardButton(text="100,000 ریال", callback_data="topup:100000"),
            InlineKeyboardButton(text="500,000 ریال", callback_data="topup:500000"),
        ],
        [
            InlineKeyboardButton(text="💳 مبلغ دلخواه", callback_data="topup:custom"),
        ],
    ])
    await message.answer(
        "💳 **شارژ کیف پول**\n\nمبلغ مورد نظر را انتخاب کنید:",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=kb
    )


# ── Callback: topup ────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("topup:"))
async def cb_topup(callback: CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    amount_str = callback.data.split(":")[1]

    if amount_str == "custom":
        await callback.message.edit_text(
            "💡 **مبلغ مورد نظر را به ریال وارد کنید:**\n\n"
            "مثال: `25000`\n\n"
            "برای لغو: /cancel",
            parse_mode=ParseMode.MARKDOWN
        )
        await state.set_state(TopupStates.waiting_for_amount)
        await callback.answer()
        return

    amount = int(amount_str)
    try:
        result = await api.create_payment(user_id, amount)
        url = result.get("url")
        if url:
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔗 پرداخت", url=url)]
            ])
            await callback.message.edit_text(
                f"💳 **پرداخت {amount:,} ریال**\n\n"
                f"روی دکمه زیر کلیک کنید:",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=kb
            )
        else:
            await callback.message.edit_text("❌ خطا در ایجاد لینک پرداخت")
    except Exception as e:
        await callback.message.edit_text(f"❌ خطا در ایجاد پرداخت")
    await callback.answer()


# ── FSM: Custom topup amount ──────────────────────────────────────────────────

@router.message(TopupStates.waiting_for_amount)
async def process_custom_amount(message: Message, state: FSMContext):
    """Handle custom topup amount input."""
    text = message.text.strip()

    # Cancel check
    if text.lower() in ['/cancel', 'لغو', 'cancel']:
        await state.clear()
        await message.answer("❌ عملیات لغو شد.")
        return

    # Validate amount
    try:
        amount = int(text.replace(",", "").replace("،", ""))
        if amount < 10000:
            await message.answer("⚠️ حداقل مبلغ شارژ: 10,000 ریال\nمجدداً تلاش کنید:")
            return
        if amount > 50_000_000:
            await message.answer("⚠️ حداکثر مبلغ شارژ: 50,000,000 ریال\nمجدداً تلاش کنید:")
            return
    except ValueError:
        await message.answer("⚠️ لطفاً یک عدد صحیح وارد کنید:\nمثال: `25000`")
        return

    # Clear state
    await state.clear()

    # Create payment
    user_id = message.from_user.id
    try:
        result = await api.create_payment(user_id, amount)
        url = result.get("url")
        if url:
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔗 پرداخت", url=url)]
            ])
            await message.answer(
                f"💳 **پرداخت {amount:,} ریال**\n\n"
                f"روی دکمه زیر کلیک کنید:",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=kb
            )
        else:
            await message.answer("❌ خطا در ایجاد لینک پرداخت")
    except Exception as e:
        await message.answer(f"❌ خطا در ایجاد پرداخت")


# ── /cancel ────────────────────────────────────────────────────────────────────

@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext):
    """Cancel any ongoing operation."""
    current_state = await state.get_state()
    if current_state is None:
        await message.answer("هیچ عملیاتی در حال انجام نیست.")
        return

    await state.clear()
    await message.answer("✅ عملیات لغو شد.")


# ── Inline Mode ────────────────────────────────────────────────────────────────

@router.inline_query()
async def inline_query(query: InlineQuery, bot: Bot):
    """Handle inline queries: @multiapi_bot model_name message"""
    text = query.query.strip()
    if not text:
        results = [
            InlineQueryResultArticle(
                id="help",
                title="💡 راهنمای inline",
                description="model_name پیام شما",
                input_message_content=InputTextMessageContent(
                    message_text="💡 **نحوه استفاده:**\n\n"
                                  "`@multiapi_bot deepseek-chat سلام`",
                    parse_mode=ParseMode.MARKDOWN
                ),
            )
        ]
        await query.answer(results, cache_time=1, is_personal=True)
        return

    parts = text.split(maxsplit=1)
    model = parts[0] if len(parts) > 0 else "deepseek-chat"
    message_text = parts[1] if len(parts) > 1 else ""

    if not message_text:
        results = [
            InlineQueryResultArticle(
                id="empty",
                title=f"⚡ Chat with {model}",
                description="پیام خود را بنویسید...",
                input_message_content=InputTextMessageContent(
                    message_text=f"⏳ در حال پردازش با `{model}`...",
                    parse_mode=ParseMode.MARKDOWN
                ),
            )
        ]
        await query.answer(results, cache_time=0, is_personal=True)
        return

    try:
        user_id = query.from_user.id
        response = await api.chat_completion(
            model=model,
            messages=[{"role": "user", "content": message_text}],
            user_id=user_id,
        )
        reply = response.get("response", "❌ خطا در پردازش")
    except Exception as e:
        reply = f"❌ خطا در پردازش"

    # Escape markdown special chars in reply
    safe_reply = reply.replace("*", "\\*").replace("_", "_").replace("`", "\\`")

    results = [
        InlineQueryResultArticle(
            id="result",
            title=f"⚡ {model}",
            description=reply[:100] + "..." if len(reply) > 100 else reply,
            input_message_content=InputTextMessageContent(
                message_text=f"**{model}:**\n\n{safe_reply}",
                parse_mode=ParseMode.MARKDOWN
            ),
        )
    ]
    await query.answer(results, cache_time=0, is_personal=True)


# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        return

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN)
    )

    # Storage for FSM
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)
    dp.include_router(router)

    logger.info("Bot starting...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
