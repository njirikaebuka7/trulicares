-- Initial Schema for TruliCares

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'family', 'caregiver', 'professional', 'facility')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    photo_url TEXT,
    stripe_customer_id TEXT,
    phone VARCHAR(20),
    notification_prefs JSONB DEFAULT '{}'::jsonb,
    privacy_prefs JSONB DEFAULT '{}'::jsonb,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Caregiver Profiles Table
CREATE TABLE IF NOT EXISTS caregiver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    specialties TEXT[] DEFAULT '{}',
    hourly_rate_min NUMERIC(10, 2),
    hourly_rate_max NUMERIC(10, 2),
    rating NUMERIC(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    location TEXT,
    verified BOOLEAN DEFAULT FALSE,
    background_checked BOOLEAN DEFAULT FALSE,
    years_experience INTEGER DEFAULT 0,
    availability TEXT,
    service_zips TEXT[] DEFAULT '{}',
    job_title TEXT,
    languages TEXT[] DEFAULT '{}',
    education TEXT,
    certifications TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Care Requests Table
CREATE TABLE IF NOT EXISTS care_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    care_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    location TEXT,
    zip VARCHAR(10),
    status TEXT NOT NULL DEFAULT 'matching' CHECK (status IN ('matching', 'matched', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES care_requests(id) ON DELETE SET NULL,
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    near_you BOOLEAN DEFAULT FALSE,
    messaging_unlocked BOOLEAN DEFAULT FALSE,
    care_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(caregiver_id, family_id)
);

-- 5. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, caregiver_id)
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_name TEXT,
    service TEXT,
    date_label TEXT,
    time_label TEXT,
    location TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    service TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(caregiver_id, family_id)
);

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_payment_intent_id TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    evidence TEXT[],
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Verification Queue Table
CREATE TABLE IF NOT EXISTS verification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty TEXT,
    experience TEXT,
    documents TEXT[],
    background_check TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_caregiver_profiles_modtime BEFORE UPDATE ON caregiver_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_care_requests_modtime BEFORE UPDATE ON care_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_matches_modtime BEFORE UPDATE ON matches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_conversations_modtime BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_verification_queue_modtime BEFORE UPDATE ON verification_queue FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
