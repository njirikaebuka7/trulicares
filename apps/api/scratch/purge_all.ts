import { query } from '../src/db.js';

async function purgeAll() {
  console.log('PURGING ALL DATABASE DATA (DELETE APPROACH)...');
  const tables = [
    'messages',
    'notifications',
    'reviews',
    'schedule',
    'payments',
    'matches',
    'conversations',
    'caregiver_profiles',
    'care_requests',
    'users'
  ];

  for (const table of tables) {
    try {
      process.stdout.write(`Purging ${table}... `);
      await query(`DELETE FROM ${table}`);
      console.log('✓');
    } catch (err: any) {
      console.log(`✗ (${err.message})`);
    }
  }

  try {
    console.log('Resetting sequences...');
    await query(`
      SELECT 'ALTER SEQUENCE ' || relname || ' RESTART WITH 1;' 
      FROM pg_class 
      WHERE relkind = 'S'
    `);
    console.log('✓');
  } catch (err) {
    console.warn('Sequence reset skipped.');
  }

  console.log('\nPurge operation complete.');
}

purgeAll().then(() => process.exit(0));
