-- Payment order schema and callback idempotency indexes.
CREATE TABLE IF NOT EXISTS payment_orders (
    id           TEXT PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_irr   BIGINT NOT NULL CHECK (amount_irr > 0),
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'failed')),
    authority    TEXT,
    ref_id       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created
    ON payment_orders(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_authority
    ON payment_orders(authority)
    WHERE authority IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_ref_id
    ON payment_orders(ref_id)
    WHERE ref_id IS NOT NULL;
