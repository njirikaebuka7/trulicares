import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getUncachableStripeClient } from '../stripeClient.js';

const router = Router();

function formatPayment(p: any) {
  return {
    id: p.id,
    description: p.description,
    amount: `$${(p.amount_cents / 100).toFixed(2)}`,
    amountCents: p.amount_cents,
    currency: p.currency,
    status: p.status,
    date: p.created_at
      ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    method: 'Visa •••• 4242',
    createdAt: p.created_at,
  };
}

// GET /api/payments
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT id, amount_cents, currency, description, status, created_at
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ payments: result.rows.map(formatPayment) });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/payments/intent
router.post('/intent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { matchId, amount = 999 } = req.body;

    let stripe: any;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      return res.json({ clientSecret: 'pi_mock_secret_for_dev', amount, currency: 'usd' });
    }

    const userResult = await query('SELECT name, email, stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user!.id]);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount, currency: 'usd', customer: customerId,
      metadata: { matchId: matchId || '', userId: req.user!.id },
      automatic_payment_methods: { enabled: true },
    });

    await query(
      `INSERT INTO payments (user_id, amount_cents, currency, stripe_payment_intent_id, description, status)
       VALUES ($1, $2, 'usd', $3, 'Messaging Unlock', 'pending')`,
      [req.user!.id, amount, paymentIntent.id]
    );

    res.json({ clientSecret: paymentIntent.client_secret, amount, currency: 'usd' });
  } catch (err: any) {
    console.error('Payment intent error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment intent' });
  }
});

// POST /api/payments/checkout
router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    let stripe: any;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      return res.status(503).json({ error: 'Payment service not configured. Connect Stripe via the Integrations tab.' });
    }

    const userResult = await query('SELECT name, email, stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user!.id]);
    }

    const host = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `https://${host}/dashboard?payment=success`,
      cancel_url: `https://${host}/dashboard?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

export default router;
