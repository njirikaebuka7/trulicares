-- Real geospatial matching: normalized location fields + PostGIS geography + GiST index.
-- Replaces the ZIP-arithmetic / hardcoded city-proximity matching.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Normalized location columns (both coordinates AND human-readable address fields).
ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT,           -- 'gps' | 'manual' | 'geocoded'
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

-- Generated geography point (NULL until coordinates are set) + GiST indexes for fast
-- ST_DWithin / ST_Distance radius queries.
ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS geo geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL END
  ) STORED;

ALTER TABLE care_requests
  ADD COLUMN IF NOT EXISTS geo geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_caregiver_geo ON caregiver_profiles USING GIST (geo);
CREATE INDEX IF NOT EXISTS idx_care_requests_geo ON care_requests USING GIST (geo);
