import { Router } from 'express';
import { query, getClient, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { transferToProfessional } from '../../services/connect.js';
import { getUncachableStripeClient } from '../../stripeClient.js';
import { forwardGeocode } from '../../services/geocode.js';

const router = Router();

/** Best-effort Stripe refund of a booking's charge back to the facility. */
async function refundBooking(booking: any): Promise<boolean> {
  if (!booking.stripe_payment_intent_id) return false;
  try {
    const stripe = await getUncachableStripeClient();
    await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
    return true;
  } catch (e: any) {
    console.error('Refund failed:', e?.message);
    return false;
  }
}

// Geofence radius: a check-in/out beyond this distance from the shift location is flagged
// as unverified (soft enforcement — recorded, not hard-blocked, since facility geocoding
// can be approximate). ~0.5 mi.
const GEOFENCE_METERS = 800;

/** Haversine distance in meters between two lat/lng points. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Given a shift's geo + the device coords, returns { distance, verified } (nulls if no data). */
function geofence(shiftLat: any, shiftLng: any, devLat: any, devLng: any) {
  const sLat = Number(shiftLat), sLng = Number(shiftLng), dLat = Number(devLat), dLng = Number(devLng);
  if (![sLat, sLng, dLat, dLng].every(Number.isFinite)) {
    return { distance: null as number | null, verified: null as boolean | null };
  }
  const distance = Math.round(distanceMeters(sLat, sLng, dLat, dLng));
  return { distance, verified: distance <= GEOFENCE_METERS };
}

// Helper: get booking with role-based ownership check
// SECURITY: Fail-closed — only professional and facility roles are allowed.
// Any other role returns null, and the caller must return 403.
async function getBookingForUser(bookingId: string, userId: string, role: string) {
  // SECURITY: reject unsupported roles before querying. Without this guard,
  // unknown roles would query by booking ID alone, leaking arbitrary booking data.
  if (role !== 'professional' && role !== 'facility') {
    return null;
  }

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
            s.location AS shift_location, s.latitude AS shift_lat, s.longitude AS shift_lng,
            fp.address AS fac_address, fp.city AS fac_city, fp.state AS fac_state, fp.zip AS fac_zip
     FROM shift_bookings sb
     JOIN professional_profiles pp ON pp.id = sb.professional_id
     JOIN facility_profiles fp ON fp.id = sb.facility_id
     JOIN shifts s ON s.id = sb.shift_id
     WHERE sb.id = $1 ${whereClause}`,
    params
  );
  return result.rows[0] || null;
}

/** Resolves shift coordinates from shift profile or geocodes facility address on the fly. */
async function getOrGeocodeShiftCoords(booking: any): Promise<{ lat: number | null; lng: number | null }> {
  const sLat = Number(booking.shift_lat);
  const sLng = Number(booking.shift_lng);
  
  if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
    return { lat: sLat, lng: sLng };
  }

  try {
    const q = [booking.fac_address, booking.fac_city, booking.fac_state, booking.fac_zip].filter(Boolean).join(', ') || booking.shift_location || '';
    if (!q) return { lat: null, lng: null };
    
    const cands = await forwardGeocode(q);
    if (cands[0] && cands[0].latitude != null && cands[0].longitude != null) {
      const lat = cands[0].latitude;
      const lng = cands[0].longitude;
      
      // Update shift table to cache the geocoded values
      await query(
        `UPDATE shifts SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3`,
        [lat, lng, booking.shift_id]
      ).catch(err => console.error('Failed to cache geocoded shift coordinates:', err));

      return { lat, lng };
    }
  } catch (err) {
    console.error('On-the-fly geocoding failed:', err);
  }
  
  return { lat: null, lng: null };
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

    // Geofenced clock-in: the check-in IS the shift start (no separate facility confirm).
    const { lat, lng } = req.body || {};
    const coords = await getOrGeocodeShiftCoords(booking);
    const { distance, verified } = geofence(coords.lat, coords.lng, lat, lng);

    const result = await query(
      `UPDATE shift_bookings
       SET status = 'in_progress',
           checked_in_at = NOW(),
           facility_confirmed_start_at = NOW(),
           check_in_lat = $2, check_in_lng = $3,
           check_in_distance_m = $4, check_in_verified = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId, lat ?? null, lng ?? null, distance, verified]
    );

    await broadcastShiftState(booking, bookingId, 'shift_started', {
      status: 'in_progress',
      checkedInAt: result.rows[0].checked_in_at,
      locationVerified: verified,
    });

    res.json({
      booking: result.rows[0],
      locationVerified: verified,
      message: verified === false
        ? 'Checked in — but you appear to be away from the shift location.'
        : 'Checked in. Your shift has started.',
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// ── POST /api/staffing/checkin/confirm-start/:bookingId — DEPRECATED ──
// The check-in now starts the shift directly (Clipboard-style). Kept for back-compat:
// if an old client calls it on a checked_in booking, just advance to in_progress.
router.post('/confirm-start/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }
    const booking = await getBookingForUser(bookingId, req.user!.id, 'facility');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'in_progress') {
      return res.json({ booking, message: 'Shift already in progress' });
    }
    if (booking.status !== 'checked_in') {
      return res.status(400).json({ error: 'Professional has not checked in yet' });
    }
    const result = await query(
      `UPDATE shift_bookings SET status = 'in_progress', facility_confirmed_start_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [bookingId]
    );
    await broadcastShiftState(booking, bookingId, 'shift_started', { status: 'in_progress' });
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

    const { lat, lng } = req.body || {};
    const coords = await getOrGeocodeShiftCoords(booking);
    const { distance, verified } = geofence(coords.lat, coords.lng, lat, lng);

    const checkedInAt = new Date(booking.checked_in_at || booking.facility_confirmed_start_at);
    const hoursWorked = Math.max(0, (Date.now() - checkedInAt.getTime()) / 3600000);
    const clockedHours = Math.round(hoursWorked * 100) / 100;

    const result = await query(
      `UPDATE shift_bookings
       SET status = 'checked_out', checked_out_at = NOW(),
           check_out_lat = $2, check_out_lng = $3,
           check_out_distance_m = $4, check_out_verified = $5,
           clocked_hours = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId, lat ?? null, lng ?? null, distance, verified, clockedHours]
    );

    await broadcastShiftState(booking, bookingId, 'checked_out', {
      status: 'checked_out',
      checkedOutAt: result.rows[0].checked_out_at,
      hoursWorked: clockedHours,
      locationVerified: verified,
    });

    res.json({
      booking: result.rows[0],
      hoursWorked: clockedHours,
      locationVerified: verified,
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

    // 1. Mark booking complete + record the facility's timesheet note (single approval step)
    const { note } = req.body || {};
    await client.query(
      `UPDATE shift_bookings
       SET status = 'completed', facility_confirmed_complete_at = NOW(),
           timesheet_note = COALESCE($2, timesheet_note), updated_at = NOW()
       WHERE id = $1`,
      [bookingId, note || null]
    );

    // Track completed-shift count for the professional's reliability score.
    await client.query(
      `UPDATE professional_profiles SET completed_shifts = completed_shifts + 1
       WHERE id = $1`,
      [booking.professional_id]
    ).catch(() => {});

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

// ── POST /api/staffing/checkin/cancel/:bookingId — Either party cancels ──
router.post('/cancel/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    const bookingId = req.params.bookingId as string;
    const { reason } = req.body || {};
    const role = req.user!.role;
    if (role !== 'professional' && role !== 'facility') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const booking = await getBookingForUser(bookingId, req.user!.id, role);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Can't cancel a finished/already-cancelled booking.
    if (['completed', 'cancelled', 'disputed'].includes(booking.status)) {
      return res.status(400).json({ error: 'This booking can no longer be cancelled' });
    }

    await client.query('BEGIN');

    // Refund the facility if money is already in escrow (paid and onward).
    const needsRefund = ['paid', 'checked_in', 'in_progress', 'checked_out'].includes(booking.status);
    let refunded = false;
    if (needsRefund) {
      refunded = await refundBooking(booking);
      await client.query(
        `UPDATE shift_escrow SET status = 'refunded', released_at = NOW() WHERE booking_id = $1 AND status = 'holding'`,
        [bookingId]
      ).catch(() => {});
    }

    await client.query(
      `UPDATE shift_bookings
       SET status = 'cancelled', cancelled_by = $2, cancelled_at = NOW(),
           cancel_reason = $3, updated_at = NOW()
       WHERE id = $1`,
      [bookingId, role, reason || null]
    );

    // Reopen the shift slot so it can be filled again.
    await client.query(
      `UPDATE shifts SET status = 'open', slots_filled = GREATEST(slots_filled - 1, 0), updated_at = NOW()
       WHERE id = $1 AND status = 'filled'`,
      [booking.shift_id]
    );

    // Reliability counter for whoever cancelled.
    if (role === 'professional') {
      await client.query(`UPDATE professional_profiles SET cancellation_count = cancellation_count + 1 WHERE id = $1`, [booking.professional_id]).catch(() => {});
    } else {
      await client.query(`UPDATE facility_profiles SET cancellation_count = cancellation_count + 1 WHERE id = $1`, [booking.facility_id]).catch(() => {});
    }

    await client.query('COMMIT');

    await broadcastShiftState(booking, bookingId, 'booking_cancelled', {
      status: 'cancelled', cancelledBy: role, refunded,
    });

    // Notify the other party.
    const otherUserId = role === 'professional' ? booking.facility_user_id : booking.pro_user_id;
    const notif = await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'shift_cancelled', 'Shift cancelled', $2) RETURNING *`,
      [otherUserId, `A ${booking.shift_role} shift was cancelled by the ${role}.${reason ? ' Reason: ' + reason : ''}`]
    ).catch(() => ({ rows: [] as any[] }));
    if (notif.rows[0]) {
      await supabase.channel(`notifications:${otherUserId}`).send({ type: 'broadcast', event: 'new_notification', payload: notif.rows[0] }).catch(() => {});
    }

    res.json({
      message: refunded ? 'Booking cancelled and the facility has been refunded.' : 'Booking cancelled.',
      refunded,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// ── POST /api/staffing/checkin/no-show/:bookingId — Facility reports a no-show ──
router.post('/no-show/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    const bookingId = req.params.bookingId as string;
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }
    const booking = await getBookingForUser(bookingId, req.user!.id, 'facility');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // A no-show only makes sense before the pro ever checked in.
    if (booking.status !== 'paid') {
      return res.status(400).json({ error: 'No-show can only be reported before the professional checks in' });
    }

    await client.query('BEGIN');

    const refunded = await refundBooking(booking);
    await client.query(
      `UPDATE shift_escrow SET status = 'refunded', released_at = NOW() WHERE booking_id = $1 AND status = 'holding'`,
      [bookingId]
    ).catch(() => {});

    await client.query(
      `UPDATE shift_bookings
       SET status = 'cancelled', is_no_show = TRUE, cancelled_by = 'facility',
           cancelled_at = NOW(), cancel_reason = COALESCE($2, 'No-show'), updated_at = NOW()
       WHERE id = $1`,
      [bookingId, req.body?.reason || null]
    );

    await client.query(
      `UPDATE professional_profiles SET no_show_count = no_show_count + 1 WHERE id = $1`,
      [booking.professional_id]
    ).catch(() => {});

    await client.query(
      `UPDATE shifts SET status = 'open', slots_filled = GREATEST(slots_filled - 1, 0), updated_at = NOW()
       WHERE id = $1 AND status = 'filled'`,
      [booking.shift_id]
    );

    await client.query('COMMIT');

    await broadcastShiftState(booking, bookingId, 'no_show', { status: 'cancelled', refunded });

    const notif = await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'shift_no_show', 'Marked as no-show', 'A facility reported that you did not show up for a shift. This affects your reliability score.') RETURNING *`,
      [booking.pro_user_id]
    ).catch(() => ({ rows: [] as any[] }));
    if (notif.rows[0]) {
      await supabase.channel(`notifications:${booking.pro_user_id}`).send({ type: 'broadcast', event: 'new_notification', payload: notif.rows[0] }).catch(() => {});
    }

    res.json({ message: 'Reported as a no-show. The charge has been refunded.', refunded });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('No-show error:', err);
    res.status(500).json({ error: 'Failed to report no-show' });
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
// SECURITY: Only professional and facility roles may access individual booking details.
router.get('/bookings/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    // SECURITY: fail-closed — reject unsupported roles before querying
    if (role !== 'professional' && role !== 'facility') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const booking = await getBookingForUser(req.params.id as string, req.user!.id, role);
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
