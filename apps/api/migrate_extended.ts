import { pool } from './src/db.js';

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE professional_profiles
        ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS govt_id_docs JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS govt_id_number TEXT,
        ADD COLUMN IF NOT EXISTS background_check_details JSONB;
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    process.exit(0);
  }
}

migrate();
