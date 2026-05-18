import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getUncachableStripeClient } from '../stripeClient.js';

const router = Router();

function formatPayment(p: any) {
  return {
    id: p.id,
    refId: p.ref_id,
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
      `SELECT id, ref_id, amount_cents, currency, description, status, created_at
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
      return res.status(503).json({ error: 'Payment service not configured' });
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
      `INSERT INTO payments (user_id, amount_cents, currency, stripe_payment_intent_id, description, status, ref_id)
       VALUES ($1, $2, 'usd', $3, 'Messaging Unlock', 'pending', generate_payment_ref())`,
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
    const { priceId, matchId, isBackgroundCheck } = req.body;
    if (!priceId && !matchId && !isBackgroundCheck) return res.status(400).json({ error: 'priceId, matchId or isBackgroundCheck is required' });

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

    const host = req.get('origin') || process.env.APP_URL || 'http://localhost:5000';
    
    let session;
    if (isBackgroundCheck) {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'TruliCares Premium Background Check',
              description: 'Identity verification, national criminal database search, sex offender registry search, and professional certification checks',
            },
            unit_amount: 3900, // $39.00
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${host}/dashboard?bg_payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/dashboard?bg_payment=cancelled`,
        metadata: { userId: req.user!.id, type: 'background_check' },
      });

      // Pre-insert pending payment for background check history
      await query(
        `INSERT INTO payments (user_id, amount_cents, currency, stripe_payment_intent_id, description, status, ref_id)
         VALUES ($1, $2, 'usd', $3, 'TruliCares Premium Background Check', 'pending', generate_payment_ref())`,
         [req.user!.id, 3900, session.id]
      );
    } else if (matchId) {
      // One-time payment for messaging unlock
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Direct Messaging Unlock',
              description: 'Unlock direct messaging with your selected caregiver',
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${host}/dashboard?tab=Matches&payment=success&matchId=${matchId}`,
        cancel_url: `${host}/dashboard?tab=Matches&payment=cancelled`,
        metadata: { matchId, userId: req.user!.id, type: 'unlock' },
      });

      // Pre-insert pending payment for the history widget
      await query(
        `INSERT INTO payments (user_id, match_id, amount_cents, currency, stripe_payment_intent_id, description, status, ref_id)
         VALUES ($1, $2, $3, 'usd', $4, 'Messaging Unlock', 'pending', generate_payment_ref())`,
        [req.user!.id, matchId, 999, session.id]
      );
    } else {
      // Subscription
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${host}/dashboard?payment=success`,
        cancel_url: `${host}/dashboard?payment=cancelled`,
      });
    }

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getOrCreateCustomer(stripe: any, userId: string) {
  const userResult = await query('SELECT name, email, stripe_customer_id FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) throw new Error('User not found');
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    customerId = customer.id;
    await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
  }
  return customerId;
}

// GET /api/payments/payment-methods
router.get('/payment-methods', requireAuth, async (req: AuthRequest, res) => {
  try {
    let stripe: any;
    try { stripe = await getUncachableStripeClient(); } catch {
      return res.json({ paymentMethods: [] });
    }
    const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const customerId = userResult.rows[0]?.stripe_customer_id;
    if (!customerId) return res.json({ paymentMethods: [] });

    const [methods, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
      stripe.customers.retrieve(customerId),
    ]);
    const defaultPmId = (customer as any).invoice_settings?.default_payment_method;
    res.json({
      paymentMethods: methods.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card?.brand ?? 'card',
        last4: pm.card?.last4 ?? '••••',
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPmId,
      })),
    });
  } catch (err: any) {
    console.error('Payment methods list error:', err);
    res.status(500).json({ error: 'Failed to list payment methods' });
  }
});

// POST /api/payments/payment-method — attach a payment method by pm_ token
// In test mode use Stripe's built-in tokens: pm_card_visa, pm_card_mastercard, etc.
router.post('/payment-method', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId is required' });
    }
    let stripe: any;
    try { stripe = await getUncachableStripeClient(); } catch {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const customerId = await getOrCreateCustomer(stripe, req.user!.id);
    // attach() returns the full PM — use it directly to avoid a second retrieve.
    // If the PM is already attached to this customer (SetupIntent confirmed it before
    // this request arrives), retrieve it instead of re-attaching.
    let pm: any;
    try {
      pm = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (attachErr: any) {
      const msg: string = attachErr?.raw?.message || attachErr?.message || '';
      const isAlreadyAttached =
        msg.toLowerCase().includes('already been attached') ||
        attachErr?.raw?.code === 'resource_already_exists';
      if (!isAlreadyAttached) throw attachErr;
      // PM was already attached — retrieve and verify it belongs to this customer
      pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (pm.customer !== customerId) {
        return res.status(403).json({ error: 'Payment method belongs to a different account' });
      }
    }
    // Set as default if this is the first/only card on the customer
    const existing = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    const isFirst = existing.data.length === 1;
    if (isFirst) {
      await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
    }
    res.json({
      paymentMethod: {
        id: pm.id,
        brand: pm.card?.brand ?? 'card',
        last4: pm.card?.last4 ?? '••••',
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: isFirst,
      },
    });
  } catch (err: any) {
    console.error('Add payment method error:', err);
    const msg = err?.raw?.message || err?.message || 'Failed to add card';
    res.status(400).json({ error: msg });
  }
});

// ── Ownership helper — verify a PM belongs to the authenticated user's customer ─
async function verifyPmOwnership(stripe: any, pmId: string, customerId: string): Promise<boolean> {
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    return pm.customer === customerId;
  } catch {
    return false;
  }
}

// DELETE /api/payments/payment-method/:id
router.delete('/payment-method/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    let stripe: any;
    try { stripe = await getUncachableStripeClient(); } catch {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const customerId = userResult.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });
    // Ownership check — prevent users from detaching other customers' payment methods
    const owned = await verifyPmOwnership(stripe, req.params.id as string, customerId);
    if (!owned) return res.status(403).json({ error: 'Payment method not found on this account' });
    await stripe.paymentMethods.detach(req.params.id);
    res.json({ message: 'Payment method removed' });
  } catch (err: any) {
    console.error('Remove payment method error:', err);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});

// PUT /api/payments/payment-method/:id/default
router.put('/payment-method/:id/default', requireAuth, async (req: AuthRequest, res) => {
  try {
    let stripe: any;
    try { stripe = await getUncachableStripeClient(); } catch {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const userResult = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const customerId = userResult.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });
    // Ownership check — prevent users from setting another customer's PM as default
    const owned = await verifyPmOwnership(stripe, req.params.id as string, customerId);
    if (!owned) return res.status(403).json({ error: 'Payment method not found on this account' });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: req.params.id } });
    res.json({ message: 'Default payment method updated' });
  } catch (err: any) {
    console.error('Set default payment method error:', err);
    res.status(500).json({ error: 'Failed to set default' });
  }
});

// GET /api/payments/config — expose publishable key to frontend (safe: pk_* is public)
router.get('/config', (_req, res) => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || '';
  res.json({ publishableKey: key });
});

// POST /api/payments/setup-intent — create a SetupIntent for card collection via Stripe Elements
router.post('/setup-intent', requireAuth, async (req: AuthRequest, res) => {
  try {
    let stripe: any;
    try { stripe = await getUncachableStripeClient(); } catch {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const customerId = await getOrCreateCustomer(stripe, req.user!.id);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err: any) {
    console.error('Setup intent error:', err);
    res.status(500).json({ error: err.message || 'Failed to create setup intent' });
  }
});

export default router;
