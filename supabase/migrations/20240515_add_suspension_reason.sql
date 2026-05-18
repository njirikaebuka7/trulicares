-- Add suspension_reason column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
