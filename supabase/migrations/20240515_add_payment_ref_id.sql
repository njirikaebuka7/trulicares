-- Add ref_id column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

-- Function to generate a random payment reference
CREATE OR REPLACE FUNCTION generate_payment_ref() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'TC-PAY-';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing payments
UPDATE payments SET ref_id = generate_payment_ref() WHERE ref_id IS NULL;

-- Make it NOT NULL for future payments
-- ALTER TABLE payments ALTER COLUMN ref_id SET NOT NULL;
