-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Addresses findings from the security audit (2024)
-- ============================================================

-- ── Issue 1: Prevent duplicate bookings via application_id ────────────
-- The schema already declares application_id as UNIQUE on shift_bookings,
-- but we enforce it explicitly with a named unique index for clarity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_bookings_application_unique
  ON shift_bookings(application_id);

-- ── Issue 4: Hashed password reset tokens ─────────────────────────────
-- Store only a SHA-256 hash of the reset token in the database.
-- The raw token is sent to the user's email and never stored.
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_used BOOLEAN DEFAULT FALSE;

-- Partial index for efficient lookup of active (unused, non-null) reset tokens
CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash)
  WHERE reset_token_hash IS NOT NULL AND reset_token_used = FALSE;

-- Clear any existing plaintext reset_token values (they become invalid
-- after this migration since the app now uses reset_token_hash instead)
UPDATE users SET reset_token = NULL WHERE reset_token IS NOT NULL;
