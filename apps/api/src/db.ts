import pg from 'pg';
import { supabase } from './supabaseClient.js';

export { supabase };
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') || process.env.DATABASE_URL?.includes('supabase.com') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Auto-migrate schema on cold start
pool.query(`
  ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS govt_id_docs JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS govt_id_number TEXT,
    ADD COLUMN IF NOT EXISTS background_check_details JSONB,
    ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_invitation_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_report_id TEXT;
`).catch(err => console.error('Auto-migration failed', err));

// Auto-migrate password-reset columns on users (required by forgot/reset-password)
pool.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
`).catch(err => console.error('users reset-token auto-migration failed', err));

// Auto-migrate Checkr columns for caregivers
pool.query(`
  ALTER TABLE caregiver_profiles
    ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_invitation_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_report_id TEXT,
    ADD COLUMN IF NOT EXISTS background_check_status TEXT NOT NULL DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ;
`).catch(err => console.error('Caregiver Checkr auto-migration failed', err));

// Auto-migrate staffing in-app chat tables
pool.query(`
  CREATE TABLE IF NOT EXISTS staffing_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES shift_bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (facility_id, professional_id)
  );
  CREATE TABLE IF NOT EXISTS staffing_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES staffing_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_staffing_msg_conversation ON staffing_messages(conversation_id, created_at);
`).catch(err => console.error('Staffing chat auto-migration failed', err));

// Auto-migrate geospatial matching (PostGIS + normalized location fields + GiST index)
pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`)
  .then(() => pool.query(`
    ALTER TABLE caregiver_profiles
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS zip_code TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS formatted_address TEXT,
      ADD COLUMN IF NOT EXISTS location_source TEXT,
      ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER DEFAULT 25;
    ALTER TABLE care_requests
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS zip_code TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS formatted_address TEXT,
      ADD COLUMN IF NOT EXISTS location_source TEXT;
  `))
  .then(() => pool.query(`
    ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS geo geography(Point,4326)
      GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography ELSE NULL END) STORED;
    ALTER TABLE care_requests ADD COLUMN IF NOT EXISTS geo geography(Point,4326)
      GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography ELSE NULL END) STORED;
    CREATE INDEX IF NOT EXISTS idx_caregiver_geo ON caregiver_profiles USING GIST (geo);
    CREATE INDEX IF NOT EXISTS idx_care_requests_geo ON care_requests USING GIST (geo);
  `))
  .catch(err => console.error('Geo matching auto-migration failed', err));

// Auto-migrate withdrawals ledger (payout requests). Actual transfer is performed by
// Stripe Connect payouts in production; this records and tracks each request.
pool.query(`
  CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','paid','failed')),
    bank_last4 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id, created_at);
`).catch(err => console.error('Withdrawals auto-migration failed', err));

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn('Slow query detected', { text: text.slice(0, 100), duration });
  }
  return result;
}

export async function getClient() {
  return pool.connect();
}
