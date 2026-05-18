-- ============================================================
-- STAFFING MODULE MIGRATION
-- Independent module for Licensed Professionals & Facilities
-- Clipboard Health-style shift-based healthcare staffing
-- ============================================================
-- IMPORTANT: This migration only adds new tables.
-- Existing family/caregiver tables are NOT modified.
-- ============================================================

-- ── Platform Settings (admin-configurable) ───────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default platform fee (20%)
INSERT INTO platform_settings (key, value, description)
VALUES ('staffing_platform_fee_rate', '0.20', 'Platform fee as decimal (e.g. 0.20 = 20%)')
ON CONFLICT (key) DO NOTHING;

-- ── Professional Profiles ────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    license_type TEXT NOT NULL, -- RN, CNA, LPN, NP, PT, OT, etc.
    license_number TEXT,
    license_state TEXT,
    license_expiry DATE,
    specialties TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    location TEXT,
    preferred_radius_miles INTEGER DEFAULT 25,
    -- Documents (stored as URLs after upload)
    license_doc_url TEXT,
    cert_doc_urls TEXT[] DEFAULT '{}',
    -- Verification
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    -- Background check placeholder
    background_check_status TEXT DEFAULT 'not_started'
        CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Facility Profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facility_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    facility_name TEXT NOT NULL,
    facility_type TEXT NOT NULL, -- hospital, nursing_home, clinic, assisted_living, etc.
    ein TEXT, -- Employer Identification Number
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    phone TEXT,
    contact_name TEXT,
    contact_title TEXT,
    website TEXT,
    -- Verification
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    -- Stripe
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shifts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id TEXT UNIQUE NOT NULL, -- Human-readable e.g. SHF-2024-00123
    facility_id UUID NOT NULL REFERENCES facility_profiles(id) ON DELETE CASCADE,
    -- Shift details
    role TEXT NOT NULL, -- RN, CNA, LPN, etc.
    specialty TEXT,
    description TEXT,
    pay_rate NUMERIC(10, 2) NOT NULL, -- $/hr (professional-visible only)
    duration_hours NUMERIC(5, 2) NOT NULL,
    total_pay NUMERIC(10, 2),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    -- Platform fee (stored at time of posting, in case rate changes)
    platform_fee_rate NUMERIC(5, 4) DEFAULT 0.20,
    -- Status
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'filled', 'cancelled', 'completed')),
    -- Slots
    slots_total INTEGER DEFAULT 1,
    slots_filled INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence for ref_id generation
CREATE SEQUENCE IF NOT EXISTS shift_ref_seq START 1000;

-- Function to auto-generate shift ref_id
CREATE OR REPLACE FUNCTION generate_shift_ref_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
        NEW.ref_id := 'SHF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('shift_ref_seq')::TEXT, 5, '0');
    END IF;
    -- Auto-calculate derived fields
    NEW.total_pay := NEW.pay_rate * NEW.duration_hours;
    NEW.end_time := NEW.start_time + (NEW.duration_hours * INTERVAL '1 hour');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shift_ref_id
BEFORE INSERT ON shifts
FOR EACH ROW EXECUTE FUNCTION generate_shift_ref_id();

-- ── Shift Applications ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    cover_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(shift_id, professional_id)
);

-- ── Shift Bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id TEXT UNIQUE NOT NULL, -- e.g. BKG-2024-00456
    application_id UUID NOT NULL REFERENCES shift_applications(id) ON DELETE RESTRICT UNIQUE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE RESTRICT,
    facility_id UUID NOT NULL REFERENCES facility_profiles(id) ON DELETE RESTRICT,
    -- Financial snapshot at booking time
    wage_amount NUMERIC(10, 2) NOT NULL, -- What pro earns
    platform_fee_amount NUMERIC(10, 2) NOT NULL, -- What platform earns
    total_charged NUMERIC(10, 2) NOT NULL, -- wage + fee (facility paid)
    -- Status flow: awaiting_payment → paid → checked_in → confirmed_start → in_progress → checked_out → completed
    status TEXT NOT NULL DEFAULT 'awaiting_payment'
        CHECK (status IN (
            'awaiting_payment', 'paid', 'checked_in', 'confirmed_start',
            'in_progress', 'checked_out', 'completed', 'disputed', 'cancelled'
        )),
    -- Check-in / Check-out
    checked_in_at TIMESTAMPTZ,
    facility_confirmed_start_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    facility_confirmed_complete_at TIMESTAMPTZ,
    -- Payment
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence for booking ref_id
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1000;

CREATE OR REPLACE FUNCTION generate_booking_ref_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
        NEW.ref_id := 'BKG-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('booking_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_ref_id
BEFORE INSERT ON shift_bookings
FOR EACH ROW EXECUTE FUNCTION generate_booking_ref_id();

-- ── Shift Escrow ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_escrow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES shift_bookings(id) ON DELETE RESTRICT UNIQUE,
    amount_held NUMERIC(10, 2) NOT NULL, -- wage_amount (what pro will get)
    fee_held NUMERIC(10, 2) NOT NULL,    -- platform fee
    status TEXT NOT NULL DEFAULT 'holding'
        CHECK (status IN ('holding', 'released', 'refunded', 'disputed')),
    held_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    released_to UUID REFERENCES users(id) -- professional user_id
);

-- ── Professional Wallets ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create wallet on professional profile creation
CREATE OR REPLACE FUNCTION create_professional_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO professional_wallets (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_wallet
AFTER INSERT ON professional_profiles
FOR EACH ROW EXECUTE FUNCTION create_professional_wallet();

-- ── Wallet Transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal', 'refund')),
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    description TEXT,
    booking_id UUID REFERENCES shift_bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bank Accounts (for withdrawal) ───────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bank_name TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    account_number_last4 TEXT NOT NULL, -- Store only last 4 digits
    routing_number TEXT NOT NULL,
    account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shift Disputes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id TEXT UNIQUE NOT NULL, -- e.g. DSP-2024-00001
    booking_id UUID NOT NULL REFERENCES shift_bookings(id) ON DELETE RESTRICT,
    raised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    raised_by_role TEXT NOT NULL CHECK (raised_by_role IN ('professional', 'facility')),
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS dispute_ref_seq START 1000;

CREATE OR REPLACE FUNCTION generate_dispute_ref_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
        NEW.ref_id := 'DSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('dispute_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dispute_ref_id
BEFORE INSERT ON shift_disputes
FOR EACH ROW EXECUTE FUNCTION generate_dispute_ref_id();

-- ── Staffing Verification Queue ───────────────────────────────
CREATE TABLE IF NOT EXISTS staffing_verification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('professional', 'facility')),
    entity_id UUID NOT NULL, -- professional_profiles.id or facility_profiles.id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shifts_facility ON shifts(facility_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_role ON shifts(role);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shift_applications_shift ON shift_applications(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_applications_professional ON shift_applications(professional_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_professional ON shift_bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_facility ON shift_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_status ON shift_bookings(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_disputes_booking ON shift_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_staffing_verification_queue_entity ON staffing_verification_queue(entity_type, entity_id);

-- ── Updated_at triggers ───────────────────────────────────────
CREATE TRIGGER update_professional_profiles_modtime
BEFORE UPDATE ON professional_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_facility_profiles_modtime
BEFORE UPDATE ON facility_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shifts_modtime
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shift_bookings_modtime
BEFORE UPDATE ON shift_bookings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shift_disputes_modtime
BEFORE UPDATE ON shift_disputes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_bank_accounts_modtime
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_professional_wallets_modtime
BEFORE UPDATE ON professional_wallets
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_staffing_verification_queue_modtime
BEFORE UPDATE ON staffing_verification_queue
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── Enable Realtime on key tables ─────────────────────────────
-- Run these in Supabase dashboard if not using CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE shift_bookings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE shift_applications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE professional_wallets;
-- ALTER PUBLICATION supabase_realtime ADD TABLE shift_disputes;
