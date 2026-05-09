import 'dotenv/config';
import app from './app.js';
import { pool } from './db.js';
const PORT = parseInt(process.env.PORT || '3001', 10);
async function verifyDatabase() {
    try {
        await pool.query('SELECT 1');
        console.log('✓ Database connected');
    }
    catch (err) {
        console.error('✗ Database connection failed:', err.message);
        throw err;
    }
}
async function runMigrations() {
    const migrations = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
        `ALTER TABLE matches ADD COLUMN IF NOT EXISTS care_date TIMESTAMP`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_prefs JSONB`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`,
    ];
    for (const sql of migrations) {
        try {
            await pool.query(sql);
        }
        catch (e) {
            console.warn('Migration warning:', e.message);
        }
    }
    console.log('✓ Migrations applied');
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
    }
    catch (err) {
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
    await runMigrations();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✓ API server running on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
