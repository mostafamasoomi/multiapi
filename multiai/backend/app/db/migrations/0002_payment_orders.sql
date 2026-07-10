-- Phase 6 payment schema migration.
-- Safe to run repeatedly on existing installations.

CREATE TABLE IF NOT EXISTS payment_orders (
    id           TEXT PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    amount_irr   BIGINT NOT NULL CHECK (amount_irr >= 10000),
    status       TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'failed')),
    authority    TEXT UNIQUE,
    ref_id       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user
    ON payment_orders(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_ref_id
    ON payment_orders(ref_id)
    WHERE ref_id IS NOT NULL;
