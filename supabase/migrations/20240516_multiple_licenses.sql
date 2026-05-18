-- ── Multiple Licenses for Professionals ─────────────────────────
CREATE TABLE IF NOT EXISTS professional_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    license_type TEXT NOT NULL, -- RN, CNA, etc.
    license_number TEXT NOT NULL,
    license_state TEXT NOT NULL, -- NY, CA, etc.
    license_expiry DATE,
    license_doc_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pro_licenses_pro_id ON professional_licenses(professional_id);

-- Optional: Add a comment
COMMENT ON TABLE professional_licenses IS 'Stores multiple licenses and certifications for a professional.';
