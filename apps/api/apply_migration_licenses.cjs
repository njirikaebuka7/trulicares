const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../../.env' });

async function apply() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const sqlPath = path.join(__dirname, '../../supabase/migrations/20240516_multiple_licenses.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

apply();
