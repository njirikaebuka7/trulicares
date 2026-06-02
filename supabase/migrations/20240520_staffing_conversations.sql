-- In-app chat for the staffing module (facility <-> professional), kept separate from
-- the family<->caregiver `conversations`/`messages` tables. A thread is created when an
-- application is accepted (a booking exists), so only matched parties can talk.

CREATE TABLE IF NOT EXISTS staffing_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,      -- facility user id
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- professional user id
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

CREATE INDEX IF NOT EXISTS idx_staffing_conv_facility ON staffing_conversations(facility_id);
CREATE INDEX IF NOT EXISTS idx_staffing_conv_professional ON staffing_conversations(professional_id);
CREATE INDEX IF NOT EXISTS idx_staffing_msg_conversation ON staffing_messages(conversation_id, created_at);
