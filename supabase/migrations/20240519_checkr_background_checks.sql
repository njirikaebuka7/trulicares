-- Checkr background-check integration columns for caregivers.
-- (professional_profiles already carries background_check_status + background_check_details.)

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT,
  ADD COLUMN IF NOT EXISTS checkr_invitation_id TEXT,
  ADD COLUMN IF NOT EXISTS checkr_report_id TEXT,
  ADD COLUMN IF NOT EXISTS background_check_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_caregiver_checkr_candidate
  ON caregiver_profiles(checkr_candidate_id);

-- professionals: make sure the Checkr id columns exist there too
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT,
  ADD COLUMN IF NOT EXISTS checkr_invitation_id TEXT,
  ADD COLUMN IF NOT EXISTS checkr_report_id TEXT;

CREATE INDEX IF NOT EXISTS idx_professional_checkr_candidate
  ON professional_profiles(checkr_candidate_id);
