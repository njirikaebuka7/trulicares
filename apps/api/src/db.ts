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

// Auto-migrate Checkr columns for caregivers
pool.query(`
  ALTER TABLE caregiver_profiles
    ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_invitation_id TEXT,
    ADD COLUMN IF NOT EXISTS checkr_report_id TEXT,
    ADD COLUMN IF NOT EXISTS background_check_status TEXT NOT NULL DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ;
`).catch(err => console.error('Caregiver Checkr auto-migration failed', err));

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
