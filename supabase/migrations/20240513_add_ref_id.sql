-- Migration: Add Ref ID and Update Reports

-- 1. Add ref_id to care_requests
ALTER TABLE care_requests ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

-- 2. Add request_id to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES care_requests(id) ON DELETE SET NULL;

-- 3. Function to generate Ref ID
CREATE OR REPLACE FUNCTION generate_trc_ref_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ref_id IS NULL THEN
        NEW.ref_id := 'TRC-' || upper(substring(md5(random()::text), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to apply Ref ID on insert
DROP TRIGGER IF EXISTS tr_generate_care_request_ref_id ON care_requests;
CREATE TRIGGER tr_generate_care_request_ref_id
BEFORE INSERT ON care_requests
FOR EACH ROW
EXECUTE FUNCTION generate_trc_ref_id();

-- 5. Backfill existing requests with Ref IDs
UPDATE care_requests SET ref_id = 'TRC-' || upper(substring(md5(id::text), 1, 8)) WHERE ref_id IS NULL;
