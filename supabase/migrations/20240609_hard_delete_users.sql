-- Make hard-deleting a user safe so the email frees up for re-signup.
--
-- Owned data already cascades on user deletion. These remaining FK references
-- used RESTRICT / NO ACTION and would block `DELETE FROM users`. They are
-- audit/reference columns, so we convert them to SET NULL (or CASCADE where the
-- row only exists because of the deleted user).

ALTER TABLE shift_escrow DROP CONSTRAINT IF EXISTS shift_escrow_released_to_fkey;
ALTER TABLE shift_escrow ADD CONSTRAINT shift_escrow_released_to_fkey
  FOREIGN KEY (released_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE shift_disputes DROP CONSTRAINT IF EXISTS shift_disputes_raised_by_fkey;
ALTER TABLE shift_disputes ADD CONSTRAINT shift_disputes_raised_by_fkey
  FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shift_disputes DROP CONSTRAINT IF EXISTS shift_disputes_resolved_by_fkey;
ALTER TABLE shift_disputes ADD CONSTRAINT shift_disputes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE staffing_verification_queue DROP CONSTRAINT IF EXISTS staffing_verification_queue_reviewed_by_fkey;
ALTER TABLE staffing_verification_queue ADD CONSTRAINT staffing_verification_queue_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
