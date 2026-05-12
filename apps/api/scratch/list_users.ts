import { query } from '../src/db.js';

async function listUsers() {
  console.log('Fetching user list from database...');
  try {
    const res = await query(`
      SELECT id, name, email, role, status, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    if (res.rows.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    console.log('\n--- User Report ---');
    console.table(res.rows.map(r => ({
      ID: r.id.substring(0, 8) + '...',
      Name: r.name,
      Email: r.email,
      Role: r.role,
      Status: r.status,
      Joined: new Date(r.created_at).toLocaleDateString()
    })));
    console.log(`Total Users: ${res.rows.length}`);
  } catch (err) {
    console.error('Error fetching users:', err);
  }
}

listUsers().then(() => process.exit(0));
