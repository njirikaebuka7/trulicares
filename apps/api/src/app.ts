import express, { type Express } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { WebhookHandlers } from './webhookHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import marketplaceRouter from './routes/marketplace.js';
import paymentsRouter from './routes/payments.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';
import clientsRouter from './routes/clients.js';
import staffingRouter from './routes/staffing/index.js';
import turnRouter from './routes/turn.js';
import backgroundCheckRouter from './routes/backgroundCheck.js';
import resourcesRouter from './routes/resources.js';
import supportRouter from './routes/support.js';
import cronRouter from './routes/cron.js';
import geoRouter from './routes/geo.js';
import settingsRouter from './routes/settings.js';
import assistantRouter from './routes/assistant.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { redisHealthCheck } from './services/redis.js';

const app: Express = express();

// ── Stripe webhook MUST be before express.json() ──────────────────────────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing stripe-signature' });

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('Webhook: body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ── Turn.ai webhook MUST be before express.json() (needs raw body for HMAC) ────
app.use('/api/turn', turnRouter);

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const redis = await redisHealthCheck();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), redis });
});

// ── Rate Limiting (Brute Force Defense) ──────────────────────────────────────
app.use('/api/auth', rateLimiter(100, 15 * 60 * 1000)); // Limit each IP to 100 requests per 15 mins on auth

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', marketplaceRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/staffing', staffingRouter); // Independent staffing module
app.use('/api/background-check', backgroundCheckRouter); // Turn.ai bg-check (caregivers + pros)
app.use('/api/resources', resourcesRouter); // public blog/resources (CMS-backed)
app.use('/api/support', supportRouter); // public support ticket creation
app.use('/api/cron', cronRouter); // Vercel Cron maintenance jobs
app.use('/api/geo', geoRouter); // geocoding (reverse/forward) for the location picker
app.use('/api/settings', settingsRouter); // public site settings (footer + contact)
app.use('/api/assistant', assistantRouter); // unified guest/auth-aware assistant

// ── 404 handler for unknown API routes ────────────────────────────────────────
app.use('/api/*path', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── Serve built frontend in production ────────────────────────────────────────
const distPath = join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/*path', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
