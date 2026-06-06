-- Fixes two verification hitches:
--  1. Admins can mark a professional/facility "needs_review", but the original CHECK only
--     allowed pending/under_review/approved/rejected → the update threw (admin action failed).
--  2. The Turn background-check webhook writes statuses like 'passed'/'failed'/'needs_review'/
--     'processing'/'expired'/'cancelled', which the original background_check_status CHECK
--     rejected → the webhook update silently failed and the provider never got verified.
--
-- We widen (and for bg-check, effectively drop) the constraints to accept the real value sets.

-- professional_profiles.verification_status
ALTER TABLE professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_verification_status_check;
ALTER TABLE professional_profiles ADD CONSTRAINT professional_profiles_verification_status_check
  CHECK (verification_status IN ('pending', 'under_review', 'needs_review', 'approved', 'rejected'));

-- professional_profiles.background_check_status (full Turn status set)
ALTER TABLE professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_background_check_status_check;
ALTER TABLE professional_profiles ADD CONSTRAINT professional_profiles_background_check_status_check
  CHECK (background_check_status IN (
    'not_started', 'pending', 'processing', 'passed', 'clear', 'approved',
    'failed', 'rejected', 'needs_review', 'expired', 'cancelled'
  ));

-- facility_profiles.verification_status
ALTER TABLE facility_profiles DROP CONSTRAINT IF EXISTS facility_profiles_verification_status_check;
ALTER TABLE facility_profiles ADD CONSTRAINT facility_profiles_verification_status_check
  CHECK (verification_status IN ('pending', 'under_review', 'needs_review', 'approved', 'rejected'));
