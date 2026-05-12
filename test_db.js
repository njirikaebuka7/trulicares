import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres.ybgqmzxdpjvwcgclsgnx:EbukaNjirika2026@aws-1-us-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 5");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
