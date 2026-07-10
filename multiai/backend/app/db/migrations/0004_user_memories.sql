-- Phase 8 per-user memory.
CREATE TABLE IF NOT EXISTS user_memories (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type   TEXT NOT NULL CHECK (memory_type IN ('fact','preference','goal','instruction','summary')),
    content       TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
    normalized_key TEXT,
    source        TEXT NOT NULL DEFAULT 'user',
    confidence    NUMERIC(4,3) NOT NULL DEFAULT 0.800 CHECK (confidence >= 0 AND confidence <= 1),
    sensitivity   TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('normal','sensitive')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_memories_active ON user_memories(user_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_key ON user_memories(user_id, normalized_key);
