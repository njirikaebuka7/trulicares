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
    ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
`).catch(err => console.error('Auto-migration failed', err));

// Auto-migrate password-reset + saved-location columns on users
pool.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS zip_code TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS formatted_address TEXT,
    ADD COLUMN IF NOT EXISTS location_source TEXT;
`).catch(err => console.error('users reset-token/location auto-migration failed', err));

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

// Auto-migrate staffing geo (shifts + professionals)
pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`)
  .then(() => pool.query(`
    ALTER TABLE shifts
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE professional_profiles
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS zip_code TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS formatted_address TEXT,
      ADD COLUMN IF NOT EXISTS location_source TEXT;
  `))
  .then(() => pool.query(`
    ALTER TABLE shifts ADD COLUMN IF NOT EXISTS geo geography(Point,4326)
      GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography ELSE NULL END) STORED;
    ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS geo geography(Point,4326)
      GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography ELSE NULL END) STORED;
    CREATE INDEX IF NOT EXISTS idx_shifts_geo ON shifts USING GIST (geo);
    CREATE INDEX IF NOT EXISTS idx_professional_geo ON professional_profiles USING GIST (geo);
  `))
  .catch(err => console.error('Staffing geo auto-migration failed', err));

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

// Support tickets + admin notes (Phase G).
pool.query(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, created_at DESC);

  CREATE TABLE IF NOT EXISTS admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_name TEXT,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON admin_notes(entity_type, entity_id, created_at DESC);
`).catch(err => console.error('support/notes auto-migration failed', err));

// Blog / resources CMS.
pool.query(`
  CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT,
    read_time TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
`).catch(err => console.error('blog_posts auto-migration failed', err));

// Platform settings (key/value) — admin-configurable pricing & config.
pool.query(`
  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`).catch(err => console.error('platform_settings auto-migration failed', err));

// Background-check event history — one row per Turn webhook/status change (timeline).
pool.query(`
  CREATE TABLE IF NOT EXISTS background_check_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_id TEXT,
    status TEXT,
    raw_status TEXT,
    source TEXT DEFAULT 'turn_webhook',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_bgevents_user ON background_check_events(user_id, created_at DESC);
`).catch(err => console.error('background_check_events auto-migration failed', err));

// Admin audit log — records consequential admin actions for accountability.
pool.query(`
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);
`).catch(err => console.error('Admin audit log auto-migration failed', err));

// Soft-delete for users (archive instead of hard delete).
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`)
  .catch(err => console.error('users.deleted_at auto-migration failed', err));

// Drop legacy plaintext PII columns — Turn.ai now handles all sensitive bg-check data.
pool.query(`
  ALTER TABLE caregiver_profiles DROP COLUMN IF EXISTS id_card_number;
  ALTER TABLE caregiver_profiles DROP COLUMN IF EXISTS background_check_details;
  ALTER TABLE professional_profiles DROP COLUMN IF EXISTS background_check_details;
  ALTER TABLE verification_queue DROP COLUMN IF EXISTS id_card_number;
  ALTER TABLE verification_queue DROP COLUMN IF EXISTS background_check_details;
  ALTER TABLE staffing_verification_queue DROP COLUMN IF EXISTS id_card_number;
  ALTER TABLE staffing_verification_queue DROP COLUMN IF EXISTS background_check_details;
`).catch(err => console.error('Legacy PII drop auto-migration failed', err));

// Helpful admin-filter indexes (avoid full scans on common admin queries).
pool.query(`
  CREATE INDEX IF NOT EXISTS idx_users_role_status_created ON users(role, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_status_priority ON reports(status, priority);
  CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at DESC);
`).catch(err => console.error('Admin index auto-migration failed', err));

// Turn.ai background checks — payment-first flow. Provider pays the platform a single
// processing fee; only after payment does the backend create a Turn check. We store ONLY
// safe fields (Turn IDs, status, timestamps, payment status) — never SSN, raw reports, or
// identity documents (Turn collects those on its hosted/consent flow). Applies to BOTH
// caregivers (marketplace) and professionals (staffing).
for (const t of ['caregiver_profiles', 'professional_profiles']) {
  pool.query(`
    ALTER TABLE ${t}
      ADD COLUMN IF NOT EXISTS background_check_fee_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS background_check_payment_status TEXT NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS background_check_payment_provider TEXT,
      ADD COLUMN IF NOT EXISTS background_check_payment_reference TEXT,
      ADD COLUMN IF NOT EXISTS background_check_paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS turn_candidate_id TEXT,
      ADD COLUMN IF NOT EXISTS turn_check_id TEXT,
      ADD COLUMN IF NOT EXISTS turn_hosted_url TEXT,
      ADD COLUMN IF NOT EXISTS background_check_package TEXT,
      ADD COLUMN IF NOT EXISTS background_check_status TEXT NOT NULL DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS background_check_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ;
  `).catch(err => console.error(`Turn bg-check auto-migration (${t}) failed`, err));
}

// Phase 5 — Instant Book: a per-shift flag letting facilities allow professionals to
// book the shift without a manual accept step (Clipboard Health style).
pool.query(`
  ALTER TABLE shifts
    ADD COLUMN IF NOT EXISTS instant_book BOOLEAN NOT NULL DEFAULT FALSE;
`).catch(err => console.error('Instant-book auto-migration failed', err));

// Phase 6 — Stripe Connect Express: real payouts to professionals' connected accounts.
// Fields are created regardless of whether Connect is enabled; real transfers stay
// disabled until STRIPE_CONNECT_ENABLED=true and the pro completes onboarding.
pool.query(`
  ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT NOT NULL DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMPTZ;
`).catch(err => console.error('Stripe Connect auto-migration failed', err));

// Booking lifecycle: geofenced clock-in/out, digital timesheet, cancellation/no-show.
pool.query(`
  ALTER TABLE shift_bookings
    ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_in_distance_m DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_in_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_out_distance_m DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS check_out_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS clocked_hours NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS timesheet_note TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_no_show BOOLEAN NOT NULL DEFAULT FALSE;
`).catch(err => console.error('Booking lifecycle auto-migration failed', err));

// Reliability counters on the profiles (drives reliability score + two-way ratings).
pool.query(`
  ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_shifts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancellation_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE facility_profiles
    ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancellation_count INTEGER NOT NULL DEFAULT 0;
`).catch(err => console.error('Reliability counters auto-migration failed', err));

// Two-way ratings — one row per (booking, rater role).
pool.query(`
  CREATE TABLE IF NOT EXISTS shift_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES shift_bookings(id) ON DELETE CASCADE,
    rater_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rater_role TEXT NOT NULL CHECK (rater_role IN ('professional','facility')),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (booking_id, rater_role)
  );
  CREATE INDEX IF NOT EXISTS idx_shift_ratings_ratee ON shift_ratings(ratee_user_id);
`).catch(err => console.error('Shift ratings auto-migration failed', err));

// Payouts ledger — one row per real Stripe Connect transfer (or attempt). Distinct from
// the legacy `withdrawals` table; this tracks automatic instant payouts on shift completion.
pool.query(`
  CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES shift_bookings(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    type TEXT NOT NULL DEFAULT 'instant' CHECK (type IN ('instant','manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
    stripe_transfer_id TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_payouts_booking ON payouts(booking_id);
`).catch(err => console.error('Payouts auto-migration failed', err));

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
