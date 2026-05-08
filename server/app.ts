import express, { type Express } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { WebhookHandlers } from './webhookHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import authRouter from './routes/auth.js';
import caregiversRouter from './routes/caregivers.js';
import requestsRouter from './routes/requests.js';
import matchesRouter from './routes/matches.js';
import messagesRouter from './routes/messages.js';
import paymentsRouter from './routes/payments.js';
import scheduleRouter from './routes/schedule.js';
import reviewsRouter from './routes/reviews.js';
import earningsRouter from './routes/earnings.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';
import clientsRouter from './routes/clients.js';

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
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/caregivers', caregiversRouter);
app.use('/api/care-requests', requestsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/conversations', messagesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/earnings', earningsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/clients', clientsRouter);

// ── 404 handler for unknown API routes ────────────────────────────────────────
app.use('/api/*path', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── Serve built frontend in production ────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
