require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  try {
    const res = await pool.query("SELECT id, name, email, role, status FROM users WHERE email LIKE '%njir%'");
    console.log('Found users:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUser();
