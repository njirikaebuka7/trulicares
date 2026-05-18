-- 1. Create OTP Codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);

-- 2. Enable Realtime for core tables
-- This allows the frontend to listen for changes via Supabase Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
    ALTER PUBLICATION supabase_realtime ADD TABLE care_requests;
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter publication supabase_realtime. Ensure it exists or check permissions.';
END $$;
