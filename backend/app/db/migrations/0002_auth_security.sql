-- =============================================================================
-- MultiAPI — Phase 3: Auth Security Hardening
-- Migration 0002: Add password_hash + user_api_tokens
-- =============================================================================

-- 1. Add password_hash column to users (nullable, for gradual migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Create user_api_tokens table for DB-backed token management
CREATE TABLE IF NOT EXISTS user_api_tokens (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    TEXT NOT NULL UNIQUE,       -- SHA-256 hex digest
    name          TEXT,                       -- label: "Web Panel", "CLI", "API"
    scope         TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'read_only')),
    revoked       BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_user ON user_api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_hash ON user_api_tokens(token_hash);