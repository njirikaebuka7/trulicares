import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// Provisions the support-admin account (CMS / contact / social / support dashboard).
// Idempotent: upserts by email. Run once with:  npm run seed:support-admin
//
// SECURITY: change this password after first login via the dashboard's Account tab.
const EMAIL = 'support@trulicares.com';
const NAME = 'Support Admin';
const PASSWORD = process.env.SUPPORT_ADMIN_PASSWORD || 'Austine@2026';

async function seed() {
  console.log('🌱 Seeding support-admin account...');

  // Ensure the role CHECK allows 'support_admin' before inserting (db.ts runs this
  // too, but its auto-migrations are fire-and-forget, so do it explicitly here).
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin','support_admin','family','caregiver','professional','facility'));
    EXCEPTION WHEN others THEN NULL; END $$;
  `);

  const hash = await bcrypt.hash(PASSWORD, 12);

  const res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, email_verified)
     VALUES ($1, $2, $3, 'support_admin', 'active', TRUE)
     ON CONFLICT (email) DO UPDATE SET
       role = 'support_admin',
       status = 'active',
       email_verified = TRUE,
       updated_at = NOW()
     RETURNING id, (xmax = 0) AS inserted`,
    [NAME, EMAIL, hash]
  );

  const row = res.rows[0];
  console.log(`✓ ${row.inserted ? 'Created' : 'Updated'} support-admin: ${EMAIL} (id ${row.id})`);
  if (!row.inserted) {
    console.log('  (account already existed; its password was left unchanged. Reset it from the Account tab.)');
  } else {
    console.log('⚠ Remember to change the password after first login (Account tab).');
  }
  await pool.end();
}

seed().catch((err) => {
  console.error('Support-admin seed failed:', err);
  process.exit(1);
});
