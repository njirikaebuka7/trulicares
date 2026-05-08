import 'dotenv/config';
import app from './app.js';
import { pool } from './db.js';

const PORT = parseInt(process.env.API_PORT || '3001', 10);

async function verifyDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connected');
  } catch (err: any) {
    console.error('✗ Database connection failed:', err.message);
    throw err;
  }
}

async function initStripe() {
  try {
    const { runMigrations } = await import('stripe-replit-sync');
    const { getStripeSync } = await import('./stripeClient.js');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return console.warn('⚠ DATABASE_URL not set — Stripe skipped');

    await runMigrations({ databaseUrl, schema: 'stripe' });
    console.log('✓ Stripe schema ready');

    const stripeSync = await getStripeSync();
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    const host = domains[0] || devDomain;

    if (host) {
      const webhookUrl = `https://${host}/api/stripe/webhook`;
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      console.log('✓ Stripe webhook configured');
    }

    stripeSync.syncBackfill()
      .then(() => console.log('✓ Stripe data synced'))
      .catch((err: any) => console.warn('⚠ Stripe sync:', err.message));
  } catch (err: any) {
    console.warn('⚠ Stripe not available:', err.message.split('\n')[0]);
  }
}

async function start() {
  await verifyDatabase();
  await initStripe();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
