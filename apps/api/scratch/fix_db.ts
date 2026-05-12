import { query } from '../src/db.js';

async function fix() {
  try {
    console.log('Applying DB fixes...');
    await query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL');
    console.log('✓ Added match_id to conversations');
  } catch (err) {
    console.error('Error fixing DB:', err);
  }
}

fix().then(() => process.exit(0));
