require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20240513_add_ref_id.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 20240513_add_ref_id.sql');
    await pool.query(migrationSql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
