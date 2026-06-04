-- Email verification (replaces phone SMS OTP).
-- A short-lived 6-digit code is emailed to the address being verified; the user enters it
-- to confirm ownership. Works both pre-account (during onboarding) and post-account.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Pending codes, keyed by email (one active code per address).
CREATE TABLE IF NOT EXISTS email_verification_codes (
    email TEXT PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completed verifications. Lets a pre-account onboarding flow verify an email before the
-- user row exists; register() then marks the new account as verified.
CREATE TABLE IF NOT EXISTS verified_emails (
    email TEXT PRIMARY KEY,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
