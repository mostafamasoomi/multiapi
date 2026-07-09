-- =============================================================================
-- multiai2 — Persian AI Gateway  |  PHASE-0 migration 0001_init.sql
-- PostgreSQL 16
--
-- SCHEMA CONTRACT (hard rules from spec):
--   * Prepaid ONLY. wallets.balance_irr is CHECK (>=0). Never negative.
--   * Two-phase HOLD/SETTLE lives in holds + ledger.
--   * Sell prices are DERIVED from fx_rates, never hand-set.
--   * User-facing catalog = model_aliases (exactly the 9Router aliases).
--   * 9Router DB is NOT used here; backend is source of truth for money.
--
-- [VERIFY] tags mark parameters to confirm against real docs before PHASE-1.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid / uuid
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- -----------------------------------------------------------------------------
-- plans:  free | subscription (fair-use internal quota) | prepaid (pay-as-you-go)
-- -----------------------------------------------------------------------------
CREATE TABLE plans (
    id                   BIGSERIAL PRIMARY KEY,
    code                 TEXT        NOT NULL UNIQUE,   -- 'free' | 'pro' | 'business'
    name                 TEXT        NOT NULL,
    billing_type         TEXT        NOT NULL
                             CHECK (billing_type IN ('free','subscription','prepaid')),
    monthly_price_irr    BIGINT      NOT NULL DEFAULT 0,
    internal_quota_tokens BIGINT     NOT NULL DEFAULT 0, -- fair-use internal quota (subscription)
    free_tier            BOOLEAN     NOT NULL DEFAULT FALSE,
    daily_token_cap      BIGINT      NOT NULL DEFAULT 0, -- hard daily token cap (free plan)
    is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                    BIGSERIAL PRIMARY KEY,
    telegram_id          TEXT UNIQUE,
    email                TEXT UNIQUE,
    username             TEXT,
    plan_id              BIGINT REFERENCES plans(id),
    status               TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','suspended','banned')),
    is_internal          BOOLEAN NOT NULL DEFAULT FALSE, -- platform/employee accounts
    -- per-user hard daily spend cap (abuse / leaked-key protection) even with full wallet
    daily_spend_cap_irr  BIGINT  NOT NULL DEFAULT 0,
    daily_spend_used_irr BIGINT  NOT NULL DEFAULT 0,
    spend_date           DATE    NOT NULL DEFAULT CURRENT_DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tgid ON users(telegram_id);

-- -----------------------------------------------------------------------------
-- wallets (prepaid balance, IRR) — NEVER negative
-- -----------------------------------------------------------------------------
CREATE TABLE wallets (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) UNIQUE,
    balance_irr   BIGINT NOT NULL DEFAULT 0 CHECK (balance_irr >= 0),
    currency      TEXT   NOT NULL DEFAULT 'IRR',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- ledger — immutable accounting log (every balance mutation is appended here)
-- -----------------------------------------------------------------------------
CREATE TABLE ledger (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id),
    txn_type          TEXT   NOT NULL
                          CHECK (txn_type IN ('topup','hold','release','settle','refund','fee','adjustment')),
    amount_irr        BIGINT NOT NULL,        -- + credit, - debit
    balance_after_irr BIGINT NOT NULL,
    ref_type          TEXT,                  -- 'hold' | 'request' | 'admin' | 'payment'
    ref_id            TEXT,
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_user ON ledger(user_id, created_at);

-- -----------------------------------------------------------------------------
-- holds — two-phase commit (HOLD before 9Router, SETTLE after stream)
-- -----------------------------------------------------------------------------
CREATE TABLE holds (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT  NOT NULL REFERENCES users(id),
    request_id        TEXT    NOT NULL UNIQUE,   -- idempotency key for the API request
    hold_amount_irr   BIGINT  NOT NULL CHECK (hold_amount_irr > 0),
    status            TEXT    NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','released','settled')),
    settled_amount_irr BIGINT,                  -- actual cost after stream; NULL until settled
    model_alias       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,     -- auto-release window
    settled_at        TIMESTAMPTZ
);
CREATE INDEX idx_holds_active ON holds(user_id, status) WHERE status='active';

-- -----------------------------------------------------------------------------
-- model_aliases — user-facing catalog == EXACTLY the 9Router aliases
-- -----------------------------------------------------------------------------
CREATE TABLE model_aliases (
    id                       BIGSERIAL PRIMARY KEY,
    alias                    TEXT    NOT NULL UNIQUE,   -- e.g. gpt-4o, claude-3-5-sonnet
    upstream_model           TEXT    NOT NULL,          -- provider model id
    provider                 TEXT    NOT NULL,          -- openai | anthropic | openrouter
    tier                     TEXT    NOT NULL CHECK (tier IN ('flagship','mid','mini')),
    upstream_cost_input_usd_per_1m  NUMERIC(12,6) NOT NULL, -- reference upstream price (USD/1M)
    upstream_cost_output_usd_per_1m NUMERIC(12,6) NOT NULL,
    max_tokens_cap           INT     NOT NULL,          -- server-side hard cap (never trust client)
    context_window           INT,
    free_tier_eligible       BOOLEAN NOT NULL DEFAULT FALSE, -- only models < ~$0.5/1M
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    auto_disabled            BOOLEAN NOT NULL DEFAULT FALSE,  -- per-model brake flips this
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- pricing — DERIVED, not hand-set. fx applied at read time (see pricing_service)
--   sell_price_irr = upstream_cost_usd * fx_rate * fx_buffer * margin_factor
--   input & output priced SEPARATELY (output 3-5x costlier upstream already; margin tiers below)
-- -----------------------------------------------------------------------------
CREATE TABLE pricing (
    id                   BIGSERIAL PRIMARY KEY,
    model_alias_id       BIGINT NOT NULL REFERENCES model_aliases(id) UNIQUE,
    input_margin_factor  NUMERIC(6,3) NOT NULL,   -- flagship 1.3-1.5 | mid 1.5-2.0 | mini 2.0-3.0
    output_margin_factor NUMERIC(6,3) NOT NULL,
    gateway_fee_pct      NUMERIC(5,3) NOT NULL DEFAULT 0.015, -- ~1-2% baked into margin
    tax_pct              NUMERIC(5,3) NOT NULL DEFAULT 0.0,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- fx_rates — history; sell prices derived from here
-- -----------------------------------------------------------------------------
CREATE TABLE fx_rates (
    id           BIGSERIAL PRIMARY KEY,
    rate_date    DATE    NOT NULL UNIQUE,
    usd_to_irr   NUMERIC(14,2) NOT NULL,
    fx_buffer    NUMERIC(5,3)  NOT NULL DEFAULT 1.12, -- 1.10-1.15 over spot
    source       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- pnl_daily — auto-populated each day
-- -----------------------------------------------------------------------------
CREATE TABLE pnl_daily (
    day                DATE PRIMARY KEY,
    revenue_irr        BIGINT      NOT NULL DEFAULT 0,
    upstream_cost_usd  NUMERIC(14,4) NOT NULL DEFAULT 0,
    fx_rate_used       NUMERIC(14,2),
    gateway_fees_irr   BIGINT      NOT NULL DEFAULT 0,
    free_tier_cost_usd NUMERIC(14,4) NOT NULL DEFAULT 0,
    gross_margin_pct   NUMERIC(6,2),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- quotas — per-user per-model hard daily token cap
-- -----------------------------------------------------------------------------
CREATE TABLE quotas (
    user_id          BIGINT NOT NULL REFERENCES users(id),
    model_alias_id   BIGINT NOT NULL REFERENCES model_aliases(id),
    daily_token_cap  BIGINT NOT NULL DEFAULT 0,
    used_tokens      BIGINT NOT NULL DEFAULT 0,
    reset_date       DATE  NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id, model_alias_id)
);

-- -----------------------------------------------------------------------------
-- global_settings — brakes & kill switch (financial safety core)
-- -----------------------------------------------------------------------------
CREATE TABLE global_settings (
    key         TEXT PRIMARY KEY,
    value_json  JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO global_settings (key, value_json) VALUES
  ('kill_switch',               '{"enabled":false,"restrict_to_subscribers":false}'),
  ('fx_circuit_breaker',        '{"pct":0.05,"lock_topups":true}'),           -- if today's rate > last-pricing*1.05
  ('per_model_margin_brake',    '{"threshold_pct":5.0,"auto_disable":true}'),
  ('global_daily_upstream_cap_usd', '{"cap_usd":500.0}'),
  ('fx_buffer',                 '{"value":1.12}');

-- -----------------------------------------------------------------------------
-- Seed plans (PHASE-0 baseline; tune in later phases)
-- -----------------------------------------------------------------------------
INSERT INTO plans (code, name, billing_type, monthly_price_irr, internal_quota_tokens, free_tier, daily_token_cap) VALUES
  ('free',       'Free',        'free',         0,    0,  TRUE,  50000),   -- cheap models only, hard daily cap
  ('pro',        'Pro',         'subscription', 0,    0,  FALSE, 0),       -- fair-use internal quota via ledger
  ('business',   'Business',    'subscription', 0,    0,  FALSE, 0),
  ('prepaid',    'Prepaid',     'prepaid',      0,    0,  FALSE, 0);       -- pay-as-you-go wallet
-- [VERIFY] monthly_price_irr values must be set from real IRR pricing decisions (out of PHASE-0 scope).

-- -----------------------------------------------------------------------------
-- Payment Orders (PHASE-6: Zarinpal order tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_orders (
    id           TEXT PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    amount_irr   BIGINT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',   -- pending | completed | failed
    authority    TEXT,                               -- Zarinpal authority code
    ref_id       TEXT,                               -- Zarinpal reference ID
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_auth ON payment_orders(authority);
