import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ybgqmzxdpjvwcgclsgnx:EbukaNjirika2026@aws-1-us-west-1.pooler.supabase.com:6543/postgres';

console.log('Database Connection String:', connectionString);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Altering matches_status_check constraint...');
    await client.query(`
      ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
    `);
    await client.query(`
      ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN ('matching', 'pending', 'accepted', 'declined', 'rejected', 'cancelled'));
    `);
    console.log('matches_status_check constraint updated successfully.');

    console.log('Adding matches table to supabase_realtime publication...');
    try {
      await client.query(`
        ALTER PUBLICATION supabase_realtime ADD TABLE matches;
      `);
      console.log('matches table added to supabase_realtime publication.');
    } catch (pubErr) {
      if (pubErr.message.includes('already exists') || pubErr.message.includes('duplicate')) {
        console.log('matches table was already in supabase_realtime publication.');
      } else {
        throw pubErr;
      }
    }

    console.log('Setting replica identity FULL on matches table...');
    await client.query(`
      ALTER TABLE matches REPLICA IDENTITY FULL;
    `);
    console.log('Replica identity set to FULL.');

    console.log('All database migration changes completed successfully!');
  } catch (err) {
    console.error('Database fix failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
