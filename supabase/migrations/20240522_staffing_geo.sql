-- Geospatial matching for the staffing module (shifts + professionals).
CREATE EXTENSION IF NOT EXISTS postgis;

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

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS geo geography(Point, 4326)
  GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography ELSE NULL END) STORED;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS geo geography(Point, 4326)
  GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography ELSE NULL END) STORED;

CREATE INDEX IF NOT EXISTS idx_shifts_geo ON shifts USING GIST (geo);
CREATE INDEX IF NOT EXISTS idx_professional_geo ON professional_profiles USING GIST (geo);
