import { Router } from 'express';
import { query, getClient, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { transferToProfessional } from '../../services/connect.js';

const router = Router();

// Helper: get booking with role-based ownership check
async function getBookingForUser(bookingId: string, userId: string, role: string) {
  let whereClause = '';
  const params: any[] = [bookingId];
  if (role === 'professional') {
    whereClause = 'AND pp.user_id = $2';
    params.push(userId);
  } else if (role === 'facility') {
    whereClause = 'AND fp.user_id = $2';
    params.push(userId);
  }

  const result = await query(
    `SELECT sb.*, pp.user_id AS pro_user_id, fp.user_id AS facility_user_id,
            s.start_time, s.duration_hours, s.role AS shift_role,
            s.location AS shift_location
     FROM shift_bookings sb
     JOIN professional_profiles pp ON pp.id = sb.professional_id
     JOIN facility_profiles fp ON fp.id = sb.facility_id
     JOIN shifts s ON s.id = sb.shift_id
     WHERE sb.id = $1 ${whereClause}`,
    params
  );
  return result.rows[0] || null;
}

async function broadcastShiftState(booking: any, bookingId: string, event: string, payload: Record<string, unknown> = {}) {
  await supabase.channel(`booking:${bookingId}`).send({
    type: 'broadcast',
    event,
    payload: { bookingId, ...payload },
  }).catch(() => {});

  await supabase.channel(`facility:${booking.facility_user_id}`).send({
    type: 'broadcast',
    event: 'shift_status_change',
    payload: { bookingId, shiftId: booking.shift_id, status: payload.status, event },
  }).catch(() => {});

  await supabase.channel(`professional:${booking.pro_user_id}`).send({
    type: 'broadcast',
    event: 'booking_status_change',
    payload: { bookingId, shiftId: booking.shift_id, status: payload.status, event },
  }).catch(() => {});
}

// ── POST /api/staffing/checkin/:bookingId — Professional checks in ──
router.post('/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const booking = await getBookingForUser(bookingId, req.user!.id, 'professional');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'paid') {
      return res.status(400).json({ error: 'Booking payment has not been confirmed' });
    }

    const result = await query(
      `UPDATE shift_bookings
       SET status = 'checked_in', checked_in_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    await broadcastShiftState(booking, bookingId, 'checked_in', {
      status: 'checked_in',
      checkedInAt: result.rows[0].checked_in_at,
    });

    res.json({ booking: result.rows[0], message: 'Check-in successful' });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// ── POST /api/staffing/checkin/confirm-start/:bookingId — Facility confirms start ──
router.post('/confirm-start/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    const booking = await getBookingForUser(bookingId, req.user!.id, 'facility');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'checked_in') {
      return res.status(400).json({ error: 'Professional has not checked in yet' });
    }

    const result = await query(
      `UPDATE shift_bookings
       SET status = 'in_progress', facility_confirmed_start_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    await broadcastShiftState(booking, bookingId, 'shift_started', {
      status: 'in_progress',
      confirmedAt: result.rows[0].facility_confirmed_start_at,
      checkedInAt: result.rows[0].checked_in_at,
    });

    res.json({ booking: result.rows[0], message: 'Shift start confirmed' });
  } catch (err) {
    console.error('Confirm start error:', err);
    res.status(500).json({ error: 'Failed to confirm shift start' });
  }
});

// ── POST /api/staffing/checkin/checkout/:bookingId — Professional checks out ──
router.post('/checkout/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const booking = await getBookingForUser(bookingId, req.user!.id, 'professional');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ error: 'Shift is not in progress' });
    }

    const result = await query(
      `UPDATE shift_bookings
       SET status = 'checked_out', checked_out_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    const checkedInAt = new Date(booking.checked_in_at || booking.facility_confirmed_start_at);
    const checkedOutAt = new Date(result.rows[0].checked_out_at);
    const hoursWorked = ((checkedOutAt.getTime() - checkedInAt.getTime()) / 3600000).toFixed(2);

    await broadcastShiftState(booking, bookingId, 'checked_out', {
      status: 'checked_out',
      checkedOutAt: result.rows[0].checked_out_at,
      hoursWorked,
    });

    res.json({
      booking: result.rows[0],
      hoursWorked: parseFloat(hoursWorked),
      message: 'Check-out successful',
    });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// ── POST /api/staffing/checkin/confirm-complete/:bookingId — Facility confirms & releases escrow ──
router.post('/confirm-complete/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT sb.*, pp.user_id AS pro_user_id, fp.user_id AS facility_user_id
       FROM shift_bookings sb
       JOIN professional_profiles pp ON pp.id = sb.professional_id
       JOIN facility_profiles fp ON fp.id = sb.facility_id
       WHERE sb.id = $1 AND fp.user_id = $2`,
      [bookingId, req.user!.id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];
    if (booking.status !== 'checked_out') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Professional has not checked out yet' });
    }

    // 1. Mark booking complete
    await client.query(
      `UPDATE shift_bookings
       SET status = 'completed', facility_confirmed_complete_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    // 2. Release escrow
    await client.query(
      `UPDATE shift_escrow
       SET status = 'released', released_at = NOW(), released_to = $1
       WHERE booking_id = $2 AND status = 'holding'`,
      [booking.pro_user_id, bookingId]
    );

    // 3. Credit professional wallet (atomic)
    const wageAmount = parseFloat(booking.wage_amount);

    const walletRes = await client.query(
      `INSERT INTO professional_wallets (user_id, balance, total_earned)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         balance = professional_wallets.balance + $2,
         total_earned = professional_wallets.total_earned + $2,
         updated_at = NOW()
       RETURNING balance`,
      [booking.pro_user_id, wageAmount]
    );
    const newBalance = walletRes.rows[0].balance;

    // 4. Create wallet transaction record
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, booking_id)
       VALUES ($1, 'credit', $2, $3, $4, $5)`,
      [
        booking.pro_user_id,
        wageAmount,
        newBalance,
        `Shift completed: ${booking.ref_id}`,
        bookingId,
      ]
    );

    // 5. Mark shift as completed
    await client.query(
      `UPDATE shifts SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [booking.shift_id]
    );

    await client.query('COMMIT');

    // ── Instant payout (Phase 6) ──────────────────────────────────────────────
    // Timesheet approved → try a real Stripe Connect transfer of the wage to the pro's
    // connected account (platform keeps its fee). If Connect is off or the pro isn't
    // onboarded, transferToProfessional() returns { mode: 'wallet' } and the funds simply
    // stay in the wallet (already credited above) for a later, gated withdrawal.
    let payoutMode: 'transferred' | 'wallet' = 'wallet';
    let balanceAfterPayout = newBalance;
    try {
      const payout = await transferToProfessional({
        userId: booking.pro_user_id,
        amount: wageAmount,
        bookingId,
        bookingRef: booking.ref_id,
        sourcePaymentIntentId: booking.stripe_payment_intent_id,
        type: 'instant',
      });
      if (payout.mode === 'transferred') {
        payoutMode = 'transferred';
        // Money has left to the pro — reflect it in the wallet ledger.
        const after = await query(
          `UPDATE professional_wallets
           SET balance = GREATEST(balance - $1, 0), total_withdrawn = total_withdrawn + $1, updated_at = NOW()
           WHERE user_id = $2
           RETURNING balance`,
          [wageAmount, booking.pro_user_id]
        );
        balanceAfterPayout = parseFloat(after.rows[0]?.balance ?? newBalance);
        await query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, booking_id)
           VALUES ($1, 'withdrawal', $2, $3, $4, $5)`,
          [booking.pro_user_id, wageAmount, balanceAfterPayout, `Instant payout: ${booking.ref_id}`, bookingId]
        );
      }
    } catch (e: any) {
      // Transfer failed — funds remain safely in the wallet. Log and continue.
      console.error('Instant payout failed (funds held in wallet):', e?.message);
    }

    await broadcastShiftState(booking, bookingId, 'shift_completed', {
      status: 'completed',
      wageAmount,
      newBalance: balanceAfterPayout,
      completedAt: new Date().toISOString(),
    });

    // Also broadcast to pro's wallet channel
    await supabase.channel(`wallet:${booking.pro_user_id}`).send({
      type: 'broadcast',
      event: 'balance_updated',
      payload: { newBalance: balanceAfterPayout, creditAmount: wageAmount, bookingRef: booking.ref_id, payoutMode },
    }).catch(() => {});

    res.json({
      message: payoutMode === 'transferred'
        ? 'Shift completed. Payout sent to the professional.'
        : 'Shift completed. Funds released to professional wallet.',
      wageReleased: wageAmount,
      platformFee: parseFloat(booking.platform_fee_amount),
      payoutMode,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Confirm complete error:', err);
    res.status(500).json({ error: 'Failed to confirm shift completion' });
  } finally {
    client.release();
  }
});

// ── GET /api/staffing/bookings — Get user's bookings ──────────
router.get('/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    let result;
    if (req.user!.role === 'professional') {
      const proRes = await query('SELECT id FROM professional_profiles WHERE user_id = $1', [req.user!.id]);
      if (proRes.rows.length === 0) return res.json({ bookings: [] });

      result = await query(
        `SELECT sb.*, s.role AS shift_role, s.pay_rate, s.duration_hours, s.total_pay,
                s.start_time, s.end_time, s.location, s.city, s.state,
                fp.facility_name, fp.facility_type, fp.city AS facility_city
         FROM shift_bookings sb
         JOIN shifts s ON s.id = sb.shift_id
         JOIN facility_profiles fp ON fp.id = sb.facility_id
         WHERE sb.professional_id = $1
         ORDER BY s.start_time DESC`,
        [proRes.rows[0].id]
      );
    } else if (req.user!.role === 'facility') {
      const facRes = await query('SELECT id FROM facility_profiles WHERE user_id = $1', [req.user!.id]);
      if (facRes.rows.length === 0) return res.json({ bookings: [] });

      result = await query(
        `SELECT sb.*, s.role AS shift_role, s.pay_rate, s.duration_hours, s.total_pay,
                s.start_time, s.end_time, s.location,
                u.name AS professional_name, pp.license_type, u.photo_url
         FROM shift_bookings sb
         JOIN shifts s ON s.id = sb.shift_id
         JOIN professional_profiles pp ON pp.id = sb.professional_id
         JOIN users u ON u.id = pp.user_id
         WHERE sb.facility_id = $1
         ORDER BY s.start_time DESC`,
        [facRes.rows[0].id]
      );
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ bookings: result!.rows });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ── GET /api/staffing/bookings/:id — Single booking ──────────
router.get('/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const booking = await getBookingForUser(req.params.id as string, req.user!.id, req.user!.role);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

export default router;
