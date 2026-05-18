-- Backend consistency migration
-- Align the checked-in schema with the API usage in the repository.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

UPDATE matches
SET ref_id = 'SES-' || upper(substring(md5(id::text), 1, 8))
WHERE ref_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_status_check'
      AND conrelid = 'matches'::regclass
  ) THEN
    ALTER TABLE matches DROP CONSTRAINT matches_status_check;
  END IF;
END $$;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('matching', 'pending', 'accepted', 'declined', 'rejected', 'cancelled'));

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

ALTER TABLE verification_queue
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

UPDATE verification_queue
SET submitted_at = COALESCE(submitted_at, created_at, NOW())
WHERE submitted_at IS NULL;

ALTER TABLE verification_queue
  ALTER COLUMN documents DROP DEFAULT;

ALTER TABLE verification_queue
  ALTER COLUMN documents TYPE JSONB
  USING CASE
    WHEN documents IS NULL THEN '[]'::jsonb
    ELSE to_jsonb(documents)
  END;

ALTER TABLE verification_queue
  ALTER COLUMN documents SET DEFAULT '[]'::jsonb;

ALTER TABLE verification_queue
  ALTER COLUMN background_check TYPE BOOLEAN
  USING CASE
    WHEN lower(COALESCE(background_check::text, 'false')) IN ('true', 't', '1', 'yes') THEN true
    ELSE false
  END;

ALTER TABLE verification_queue
  ALTER COLUMN background_check SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payments_match_id ON payments(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_ref_id ON matches(ref_id);
CREATE INDEX IF NOT EXISTS idx_reports_ref_id ON reports(ref_id);
CREATE INDEX IF NOT EXISTS idx_reports_match_id ON reports(match_id);
CREATE INDEX IF NOT EXISTS idx_verification_queue_submitted_at ON verification_queue(submitted_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
    ALTER PUBLICATION supabase_realtime ADD TABLE reports;
    ALTER PUBLICATION supabase_realtime ADD TABLE verification_queue;
    ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
    ALTER PUBLICATION supabase_realtime ADD TABLE shift_applications;
    ALTER PUBLICATION supabase_realtime ADD TABLE shift_bookings;
    ALTER PUBLICATION supabase_realtime ADD TABLE professional_wallets;
    ALTER PUBLICATION supabase_realtime ADD TABLE shift_disputes;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_table THEN
    NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not extend supabase_realtime publication: %', SQLERRM;
END $$;
