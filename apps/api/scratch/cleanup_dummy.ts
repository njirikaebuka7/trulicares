import { query } from '../src/db.js';

async function cleanup() {
  console.log('Cleaning up dummy data...');
  try {
    // 1. Delete matches involving example.com users
    await query(`
      DELETE FROM matches 
      WHERE family_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
         OR caregiver_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
    `);
    
    // 2. Delete conversations
    await query(`
      DELETE FROM conversations 
      WHERE family_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
         OR caregiver_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
    `);

    // 3. Delete care requests
    await query(`
      DELETE FROM care_requests 
      WHERE family_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
    `);

    // 4. Delete caregiver profiles
    await query(`
      DELETE FROM caregiver_profiles 
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')
    `);

    // 5. Delete users
    const res = await query(`
      DELETE FROM users 
      WHERE email LIKE '%@example.com'
      RETURNING id, email
    `);

    console.log(`Deleted ${res.rows.length} dummy users:`, res.rows.map(r => r.email));
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

cleanup().then(() => process.exit(0));
