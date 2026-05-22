-- Add extended fields to professional_profiles

ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS govt_id_docs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS govt_id_number TEXT,
  ADD COLUMN IF NOT EXISTS background_check_details JSONB;
