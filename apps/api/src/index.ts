import 'dotenv/config';
import app from './app.js';
import { pool } from './db.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function verifyDatabase() {
  // Best-effort connectivity check. A transient DB hiccup must NOT take the whole
  // server down — we log and keep serving so it recovers automatically once the DB is back.
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connected');
  } catch (err: any) {
    console.error('⚠ Database not reachable at startup (will retry on demand):', err.message);
  }

  // Auto-migrate extended professional profile fields (best-effort; never fatal).
  try {
    await pool.query(`
      ALTER TABLE professional_profiles
        ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS govt_id_docs JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
    `);
  } catch (err: any) {
    console.error('⚠ professional_profiles auto-migration skipped:', err.message);
  }
}

async function verifyStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('⚠ STRIPE_SECRET_KEY not set — payments disabled');
    return;
  }
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(key);
    await stripe.paymentMethods.list({ limit: 1 });
    console.log('✓ Stripe connected');
  } catch (err: any) {
    console.warn('⚠ Stripe check failed:', err.message.split('\n')[0]);
  }
}

async function verifyResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('⚠ RESEND_API_KEY not set — emails will be logged only');
    return;
  }
  console.log('✓ Resend email configured');
}

async function start() {
  await verifyDatabase();
  await verifyStripe();
  await verifyResend();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
