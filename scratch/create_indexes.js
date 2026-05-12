require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createIndexes() {
  console.log('Connecting to Supabase database...');
  const client = await pool.connect();
  try {
    console.log('Starting index creation matching free-tier suitability...');

    // 1. GIN index on specialties array column
    console.log('Creating GIN index on caregiver_profiles(specialties)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_specialties 
      ON caregiver_profiles USING gin (specialties);
    `);

    // 2. GIN index on service_zips array column
    console.log('Creating GIN index on caregiver_profiles(service_zips)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_service_zips 
      ON caregiver_profiles USING gin (service_zips);
    `);

    // 3. Composite indexes on matches table status querying
    console.log('Creating composite index on matches(family_id, status)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_family_status 
      ON matches (family_id, status);
    `);

    console.log('Creating composite index on matches(caregiver_id, status)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_caregiver_status 
      ON matches (caregiver_id, status);
    `);

    // 4. Index on care_requests table
    console.log('Creating index on care_requests(family_id)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_care_requests_family_id 
      ON care_requests (family_id);
    `);

    console.log('🎉 All indexes successfully created on Supabase!');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createIndexes();
