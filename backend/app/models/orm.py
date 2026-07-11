"""PHASE-0: SQLAlchemy ORM models mapped to migration 0001_init.sql.

All money columns are BIGINT (IRR minor units) or NUMERIC (USD) — never float
for money. Wallet balance has a DB-level CHECK (>=0) in the migration.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str]
    billing_type: Mapped[str]  # free | subscription | prepaid
    monthly_price_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    internal_quota_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    free_tier: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_token_cap: Mapped[int] = mapped_column(BigInteger, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    telegram_id: Mapped[str | None] = mapped_column(String, unique=True)
    email: Mapped[str | None] = mapped_column(String, unique=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    username: Mapped[str | None]
    password_hash: Mapped[str | None] = mapped_column(String(255))
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"))
    status: Mapped[str] = mapped_column(String, default="active")
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_spend_cap_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    daily_spend_used_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    spend_date: Mapped[date] = mapped_column(Date, default=date.today)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class UserApiToken(Base):
    """Per-user API tokens stored as SHA-256 hashes. Supports rotation, revocation, expiry."""
    __tablename__ = "user_api_tokens"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)   # SHA-256 hex
    name: Mapped[str | None] = mapped_column(String(128))               # e.g. "Web Panel", "CLI"
    scope: Mapped[str] = mapped_column(String(32), default="full")      # full | read_only
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (CheckConstraint("balance_irr >= 0", name="chk_wallet_nonneg"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    balance_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    currency: Mapped[str] = mapped_column(String, default="IRR")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class Ledger(Base):
    __tablename__ = "ledger"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    txn_type: Mapped[str]  # topup | hold | release | settle | refund | fee | adjustment
    amount_irr: Mapped[int]
    balance_after_irr: Mapped[int]
    ref_type: Mapped[str | None]
    ref_id: Mapped[str | None]
    note: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Hold(Base):
    __tablename__ = "holds"
    __table_args__ = (CheckConstraint("hold_amount_irr > 0", name="chk_hold_pos"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    request_id: Mapped[str] = mapped_column(String, unique=True)
    hold_amount_irr: Mapped[int]
    status: Mapped[str] = mapped_column(String, default="active")  # active | released | settled
    settled_amount_irr: Mapped[int | None]
    model_alias: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow() + timedelta(hours=1)
    )
    settled_at: Mapped[datetime | None]


class ModelAlias(Base):
    __tablename__ = "model_aliases"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    alias: Mapped[str] = mapped_column(String, unique=True)
    upstream_model: Mapped[str]
    provider: Mapped[str]
    tier: Mapped[str]  # flagship | mid | mini
    upstream_cost_input_usd_per_1m: Mapped[float] = mapped_column(Numeric(12, 6))
    upstream_cost_output_usd_per_1m: Mapped[float] = mapped_column(Numeric(12, 6))
    max_tokens_cap: Mapped[int]
    context_window: Mapped[int | None]
    free_tier_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class Pricing(Base):
    __tablename__ = "pricing"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    model_alias_id: Mapped[int] = mapped_column(ForeignKey("model_aliases.id"), unique=True)
    input_margin_factor: Mapped[float] = mapped_column(Numeric(6, 3))
    output_margin_factor: Mapped[float] = mapped_column(Numeric(6, 3))
    gateway_fee_pct: Mapped[float] = mapped_column(Numeric(5, 3), default=0.015)
    tax_pct: Mapped[float] = mapped_column(Numeric(5, 3), default=0.0)
    notes: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class FxRate(Base):
    __tablename__ = "fx_rates"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    rate_date: Mapped[date] = mapped_column(Date, unique=True)
    usd_to_irr: Mapped[float] = mapped_column(Numeric(14, 2))
    fx_buffer: Mapped[float] = mapped_column(Numeric(5, 3), default=1.12)
    source: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class PnlDaily(Base):
    __tablename__ = "pnl_daily"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    revenue_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    upstream_cost_usd: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    fx_rate_used: Mapped[float | None] = mapped_column(Numeric(14, 2))
    gateway_fees_irr: Mapped[int] = mapped_column(BigInteger, default=0)
    free_tier_cost_usd: Mapped[float] = mapped_column(Numeric(14, 4), default=0)
    gross_margin_pct: Mapped[float | None] = mapped_column(Numeric(6, 2))


class Quota(Base):
    __tablename__ = "quotas"
    __table_args__ = (UniqueConstraint("user_id", "model_alias_id", name="uq_quota"),)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    model_alias_id: Mapped[int] = mapped_column(ForeignKey("model_aliases.id"), primary_key=True)
    daily_token_cap: Mapped[int] = mapped_column(BigInteger, default=0)
    used_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    reset_date: Mapped[date] = mapped_column(Date, default=date.today)


class GlobalSetting(Base):
    __tablename__ = "global_settings"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value_json: Mapped[dict] = mapped_column(Text)  # stored as JSON text
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount_irr: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | completed | failed
    authority: Mapped[str | None] = mapped_column(String)
    ref_id: Mapped[str | None] = mapped_column(String)  # Zarinpal ref_id
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(String(500))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
