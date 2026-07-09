"""PHASE-5: Bot configuration."""
from __future__ import annotations

import os

# Bot
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# Backend
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
BACKEND_INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")

# Database (for direct access if needed)
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Payment
PAYMENT_CALLBACK_URL = os.getenv("PAYMENT_CALLBACK_URL", "")
