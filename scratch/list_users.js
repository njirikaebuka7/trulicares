require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listUsers() {
  try {
    const res = await pool.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error listing users:', err);
  } finally {
    await pool.end();
  }
}

listUsers();
