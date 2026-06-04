import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getUncachableStripeClient } from '../stripeClient.js';
import { resendBackgroundCheckLink } from '../services/backgroundCheck.js';
import { turnEnabled } from '../services/turn.js';

const router = Router();

const PROVIDER_ROLES = ['caregiver', 'professional'];
function tableForRole(role: string) {
  return role === 'professional' ? 'professional_profiles' : 'caregiver_profiles';
}

/** Single platform background-check processing fee (USD). Configurable via env / settings. */
async function getFeeCents(): Promise<number> {
  // Prefer an admin-configured platform setting, then env, then default.
  try {
    const s = await query("SELECT value FROM platform_settings WHERE key = 'background_check_fee'", []);
    if (s.rows[0]?.value) {
      const dollars = parseFloat(s.rows[0].value);
      if (Number.isFinite(dollars) && dollars > 0) return Math.round(dollars * 100);
    }
  } catch { /* table/row may not exist */ }
  const env = parseFloat(process.env.BACKGROUND_CHECK_FEE_AMOUNT || '');
  if (Number.isFinite(env) && env > 0) return Math.round(env * 100);
  return 3900; // $39.00 default
}

// ── GET /api/background-check/status — current payment + check state ──
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!PROVIDER_ROLES.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only caregivers and professionals have background checks' });
    }
    const table = tableForRole(req.user!.role);
    const r = await query(
      `SELECT background_check_status, background_check_payment_status, background_check_fee_amount,
              turn_hosted_url, background_check_started_at, background_check_completed_at
       FROM ${table} WHERE user_id = $1`,
      [req.user!.id]
    );
    const row = r.rows[0] || {};
    const feeCents = await getFeeCents();
    res.json({
      status: row.background_check_status || 'not_started',
      paymentStatus: row.background_check_payment_status || 'unpaid',
      feeAmount: row.background_check_fee_amount != null ? Number(row.background_check_fee_amount) : feeCents / 100,
      hostedUrl: row.turn_hosted_url || null,
      startedAt: row.background_check_started_at || null,
      completedAt: row.background_check_completed_at || null,
      provider: turnEnabled() ? 'turn' : 'manual',
    });
  } catch (err) {
    console.error('BG status error:', err);
    res.status(500).json({ error: 'Failed to fetch background check status' });
  }
});

// ── POST /api/background-check/start — pay the processing fee, then Turn check starts ──
router.post('/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!PROVIDER_ROLES.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only caregivers and professionals can start a background check' });
    }
    const table = tableForRole(req.user!.role);

    const cur = await query(
      `SELECT background_check_status, background_check_payment_status, turn_hosted_url FROM ${table} WHERE user_id = $1`,
      [req.user!.id]
    );
    const row = cur.rows[0] || {};
    if (row.background_check_status === 'passed') {
      return res.status(400).json({ error: 'Your background check has already passed.' });
    }
    // Already paid and a check is underway → no double charge; just resurface the link.
    if (row.background_check_payment_status === 'paid' && ['pending', 'processing', 'needs_review'].includes(row.background_check_status)) {
      return res.json({ alreadyPaid: true, hostedUrl: row.turn_hosted_url || null });
    }

    let stripe: any;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      return res.status(503).json({ error: 'Payment service not configured.' });
    }

    const feeCents = await getFeeCents();
    const userRes = await query('SELECT name, email, stripe_customer_id FROM users WHERE id = $1', [req.user!.id]);
    const user = userRes.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user!.id]);
    }

    const host = req.get('origin') || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
    const dest = req.user!.role === 'professional' ? '/professional-dashboard/profile' : '/dashboard';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Background Check Processing Fee',
            description: 'One-time processing fee. Your check is run securely by our partner Turn; TruliCares never stores your sensitive data.',
          },
          unit_amount: feeCents,
        },
        quantity: 1,
      }],
      success_url: `${host}${dest}?bg_payment=success`,
      cancel_url: `${host}${dest}?bg_payment=cancelled`,
      metadata: { userId: req.user!.id, type: 'background_check', role: req.user!.role },
    });

    // Mark fee + payment intent; status stays unpaid until the webhook confirms.
    await query(
      `UPDATE ${table}
       SET background_check_fee_amount = $1,
           background_check_payment_status = 'pending',
           background_check_payment_provider = 'stripe',
           background_check_payment_reference = $2
       WHERE user_id = $3`,
      [feeCents / 100, session.id, req.user!.id]
    ).catch(() => {});

    await query(
      `INSERT INTO payments (user_id, amount_cents, currency, stripe_payment_intent_id, description, status, ref_id)
       VALUES ($1, $2, 'usd', $3, 'Background Check Processing Fee', 'pending', generate_payment_ref())`,
      [req.user!.id, feeCents, session.id]
    ).catch(() => {});

    res.json({ checkoutUrl: session.url, feeAmount: feeCents / 100 });
  } catch (err: any) {
    console.error('BG start error:', err);
    res.status(500).json({ error: err?.message || 'Failed to start background check' });
  }
});

// ── POST /api/background-check/resend — resurface the Turn hosted consent link ──
router.post('/resend', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!PROVIDER_ROLES.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const url = await resendBackgroundCheckLink(req.user!.id, req.user!.role);
    if (!url) return res.status(404).json({ error: 'No active background check link found. Start a check first.' });
    res.json({ url });
  } catch (err) {
    console.error('BG resend error:', err);
    res.status(500).json({ error: 'Failed to resend background check link' });
  }
});

export default router;
