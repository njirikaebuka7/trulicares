require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearAllUsers() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Starting transaction to clear all tables cleanly...');
    await client.query('BEGIN');

    // 1. Clear messages and conversations (since messages has a NOT NULL / ON DELETE SET NULL conflict)
    console.log('Clearing messages...');
    await client.query('DELETE FROM messages');

    console.log('Clearing conversations...');
    await client.query('DELETE FROM conversations');

    // 2. Clear matches and requests
    console.log('Clearing matches...');
    await client.query('DELETE FROM matches');

    console.log('Clearing care requests...');
    await client.query('DELETE FROM care_requests');

    // 3. Clear reviews, payments, caregiver profiles
    console.log('Clearing reviews...');
    await client.query('DELETE FROM reviews');

    console.log('Clearing payments...');
    await client.query('DELETE FROM payments');

    console.log('Clearing caregiver profiles...');
    await client.query('DELETE FROM caregiver_profiles');

    // 4. Finally, clear all users
    console.log('Clearing users...');
    const res = await client.query('DELETE FROM users');

    await client.query('COMMIT');
    console.log(`Successfully deleted all users. Rows affected: ${res.rowCount}`);
    console.log('Database has been completely and cleanly reset to a blank slate!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error clearing users:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllUsers();
