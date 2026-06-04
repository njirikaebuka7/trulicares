import { Router } from 'express';
import { query, getClient } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import {
  isConnectEnabled,
  createOnboardingLink,
  refreshConnectStatus,
  transferToProfessional,
} from '../../services/connect.js';

const router = Router();

// ── GET /api/staffing/wallet — Professional's wallet ─────────
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const [walletRes, txRes, connectRes] = await Promise.all([
      query(
        `SELECT pw.balance, pw.total_earned, pw.total_withdrawn, pw.updated_at
         FROM professional_wallets pw
         WHERE pw.user_id = $1`,
        [req.user!.id]
      ),
      query(
        `SELECT wt.*, sb.ref_id AS booking_ref
         FROM wallet_transactions wt
         LEFT JOIN shift_bookings sb ON sb.id = wt.booking_id
         WHERE wt.user_id = $1
         ORDER BY wt.created_at DESC
         LIMIT 50`,
        [req.user!.id]
      ),
      query(
        `SELECT stripe_connected_account_id, stripe_onboarding_status, stripe_payouts_enabled
         FROM professional_profiles WHERE user_id = $1`,
        [req.user!.id]
      ),
    ]);

    const wallet = walletRes.rows[0] || { balance: 0, total_earned: 0, total_withdrawn: 0 };
    const c = connectRes.rows[0] || {};

    res.json({
      balance: parseFloat(wallet.balance || 0),
      totalEarned: parseFloat(wallet.total_earned || 0),
      totalWithdrawn: parseFloat(wallet.total_withdrawn || 0),
      transactions: txRes.rows,
      payouts: {
        connectEnabled: isConnectEnabled(),
        onboardingStatus: c.stripe_onboarding_status || 'not_started',
        payoutsEnabled: !!c.stripe_payouts_enabled,
        hasAccount: !!c.stripe_connected_account_id,
      },
    });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// ── GET /api/staffing/wallet/connect/status — Connect onboarding state ──
router.get('/connect/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    if (!isConnectEnabled()) {
      return res.json({
        connectEnabled: false,
        onboardingStatus: 'not_started',
        payoutsEnabled: false,
        message: 'Payouts are not yet enabled on this platform.',
      });
    }
    // Pull fresh state from Stripe (also persists it).
    const state = await refreshConnectStatus(req.user!.id);
    res.json({
      connectEnabled: true,
      onboardingStatus: state.status,
      payoutsEnabled: state.payoutsEnabled,
      detailsSubmitted: state.detailsSubmitted,
    });
  } catch (err) {
    console.error('Connect status error:', err);
    res.status(500).json({ error: 'Failed to fetch payout status' });
  }
});

// ── POST /api/staffing/wallet/connect/onboard — Start/continue Connect onboarding ──
router.post('/connect/onboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    if (!isConnectEnabled()) {
      return res.status(503).json({
        error: 'Payouts are not yet enabled. Please check back soon.',
        code: 'CONNECT_NOT_ENABLED',
      });
    }
    const url = await createOnboardingLink(req.user!.id);
    res.json({ url });
  } catch (err: any) {
    console.error('Connect onboard error:', err);
    res.status(500).json({ error: err?.message || 'Failed to start payout onboarding' });
  }
});

// ── POST /api/staffing/wallet/withdraw — Manual payout via Stripe Connect ──
// Gated: real money only moves when Connect is enabled AND the pro is onboarded. We never
// create fake withdrawals — if payouts aren't live, we return a clear, non-mutating error.
router.post('/withdraw', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'professional') {
    return res.status(403).json({ error: 'Professional access only' });
  }

  const { amount } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid withdrawal amount is required' });
  }
  const withdrawAmount = parseFloat(amount);

  if (!isConnectEnabled()) {
    return res.status(503).json({
      error: 'Payouts are not enabled yet. Your earnings are safe in your wallet and will be payable once payouts go live.',
      code: 'CONNECT_NOT_ENABLED',
    });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const walletRes = await client.query(
      'SELECT balance FROM professional_wallets WHERE user_id = $1 FOR UPDATE',
      [req.user!.id]
    );
    if (walletRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const balance = parseFloat(walletRes.rows[0].balance);
    if (withdrawAmount > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Connect onboarding must be complete (payouts_enabled) before money can move.
    const proRes = await client.query(
      'SELECT stripe_payouts_enabled FROM professional_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (!proRes.rows[0]?.stripe_payouts_enabled) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Finish setting up payouts (identity & bank details) before withdrawing.',
        code: 'ONBOARDING_INCOMPLETE',
      });
    }

    const newBalance = parseFloat((balance - withdrawAmount).toFixed(2));

    // Deduct optimistically inside the txn; if the transfer fails we roll back.
    await client.query(
      `UPDATE professional_wallets
       SET balance = $1, total_withdrawn = total_withdrawn + $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newBalance, withdrawAmount, req.user!.id]
    );

    // Real Stripe Connect transfer. Throws on failure → rolls back the deduction.
    const result = await transferToProfessional({
      userId: req.user!.id,
      amount: withdrawAmount,
      type: 'manual',
    });

    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, 'withdrawal', $2, $3, $4)`,
      [req.user!.id, withdrawAmount, newBalance, 'Payout to your bank via Stripe']
    );

    await client.query('COMMIT');

    res.json({
      message: 'Payout sent. Funds typically arrive in 1-2 business days.',
      amount: withdrawAmount,
      newBalance,
      status: 'paid',
      transferId: result.transferId,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: err?.message || 'Failed to process payout' });
  } finally {
    client.release();
  }
});

// ── POST /api/staffing/wallet/bank-account — Save bank details ──
router.post('/bank-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const { bankName, accountHolderName, accountNumber, routingNumber, accountType } = req.body;
    if (!bankName || !accountHolderName || !accountNumber || !routingNumber) {
      return res.status(400).json({ error: 'All bank details are required' });
    }

    const last4 = accountNumber.slice(-4);

    const result = await query(
      `INSERT INTO bank_accounts (user_id, bank_name, account_holder_name, account_number_last4, routing_number, account_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         bank_name = EXCLUDED.bank_name,
         account_holder_name = EXCLUDED.account_holder_name,
         account_number_last4 = EXCLUDED.account_number_last4,
         routing_number = EXCLUDED.routing_number,
         account_type = EXCLUDED.account_type,
         updated_at = NOW()
       RETURNING id, bank_name, account_holder_name, account_number_last4, account_type, created_at`,
      [req.user!.id, bankName, accountHolderName, last4, routingNumber, accountType || 'checking']
    );

    res.json({ bankAccount: result.rows[0], message: 'Bank account saved successfully' });
  } catch (err) {
    console.error('Save bank account error:', err);
    res.status(500).json({ error: 'Failed to save bank account' });
  }
});

// ── GET /api/staffing/wallet/bank-account — Get saved bank details ──
router.get('/bank-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const result = await query(
      `SELECT id, bank_name, account_holder_name, account_number_last4, account_type, created_at
       FROM bank_accounts WHERE user_id = $1`,
      [req.user!.id]
    );

    res.json({ bankAccount: result.rows[0] || null });
  } catch (err) {
    console.error('Get bank account error:', err);
    res.status(500).json({ error: 'Failed to fetch bank account' });
  }
});

export default router;
