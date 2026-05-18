import { Router } from 'express';
import { query, getClient } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// ── GET /api/staffing/wallet — Professional's wallet ─────────
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const [walletRes, txRes] = await Promise.all([
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
    ]);

    const wallet = walletRes.rows[0] || { balance: 0, total_earned: 0, total_withdrawn: 0 };

    res.json({
      balance: parseFloat(wallet.balance || 0),
      totalEarned: parseFloat(wallet.total_earned || 0),
      totalWithdrawn: parseFloat(wallet.total_withdrawn || 0),
      transactions: txRes.rows,
    });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// ── POST /api/staffing/wallet/withdraw — Request withdrawal ──
router.post('/withdraw', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required' });
    }

    await client.query('BEGIN');

    // Check balance
    const walletRes = await client.query(
      'SELECT balance FROM professional_wallets WHERE user_id = $1 FOR UPDATE',
      [req.user!.id]
    );
    if (walletRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const balance = parseFloat(walletRes.rows[0].balance);
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check bank account is saved
    const bankRes = await client.query(
      'SELECT id, bank_name, account_number_last4 FROM bank_accounts WHERE user_id = $1',
      [req.user!.id]
    );
    if (bankRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Please add your bank account details before withdrawing' });
    }

    const newBalance = parseFloat((balance - withdrawAmount).toFixed(2));

    // Deduct from wallet
    await client.query(
      `UPDATE professional_wallets
       SET balance = $1, total_withdrawn = total_withdrawn + $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newBalance, withdrawAmount, req.user!.id]
    );

    // Log transaction
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, 'withdrawal', $2, $3, $4)`,
      [req.user!.id, withdrawAmount, newBalance, `Withdrawal to ${bankRes.rows[0].bank_name} ****${bankRes.rows[0].account_number_last4}`]
    );

    await client.query('COMMIT');

    // NOTE: In production, trigger Stripe Connect payout here
    res.json({
      message: 'Withdrawal request submitted. Funds will arrive in 1-3 business days.',
      amount: withdrawAmount,
      newBalance,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Failed to process withdrawal' });
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
