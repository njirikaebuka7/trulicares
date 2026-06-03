import { Router } from 'express';
import { query, getClient, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { getUncachableStripeClient } from '../../stripeClient.js';
import { enqueueEmail } from '../../queues/queues.js';
import { notifyAdmins } from '../../services/notify.js';

const router = Router();

// ── POST /api/staffing/disputes — Raise a dispute ────────────
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    if (role !== 'professional' && role !== 'facility') {
      return res.status(403).json({ error: 'Professional or Facility access only' });
    }

    const { bookingId, reason, description } = req.body;
    if (!bookingId || !reason) {
      return res.status(400).json({ error: 'Booking ID and reason are required' });
    }

    // Verify user is part of this booking
    let ownershipCheck;
    if (role === 'professional') {
      ownershipCheck = await query(
        `SELECT sb.id FROM shift_bookings sb
         JOIN professional_profiles pp ON pp.id = sb.professional_id
         WHERE sb.id = $1 AND pp.user_id = $2`,
        [bookingId, req.user!.id]
      );
    } else {
      ownershipCheck = await query(
        `SELECT sb.id FROM shift_bookings sb
         JOIN facility_profiles fp ON fp.id = sb.facility_id
         WHERE sb.id = $1 AND fp.user_id = $2`,
        [bookingId, req.user!.id]
      );
    }

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not associated with this booking' });
    }

    // Check no open dispute already exists
    const existing = await query(
      `SELECT id FROM shift_disputes
       WHERE booking_id = $1 AND raised_by = $2 AND status NOT IN ('resolved', 'dismissed')`,
      [bookingId, req.user!.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An open dispute already exists for this booking' });
    }

    const result = await query(
      `INSERT INTO shift_disputes (ref_id, booking_id, raised_by, raised_by_role, reason, description)
       VALUES ('', $1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, req.user!.id, role, reason, description || null]
    );

    // Mark booking as disputed
    await query(
      `UPDATE shift_bookings SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    ).catch(() => {}); // Non-blocking

    // Alert admins (before responding — serverless freezes after the response).
    await notifyAdmins({
      subject: `New dispute raised (${role})`,
      heading: 'New shift dispute',
      message: `A ${role} raised a dispute (reason: ${reason}) on a booking. Review and resolve it in the admin dashboard.`,
      details: [['Reason', String(reason)], ['Raised by', role]],
    });

    res.status(201).json({ dispute: result.rows[0], message: 'Dispute submitted. Our team will review within 24 hours.' });
  } catch (err) {
    console.error('Raise dispute error:', err);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// ── GET /api/staffing/disputes/my — User's own disputes ──────
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    if (role !== 'professional' && role !== 'facility') {
      return res.status(403).json({ error: 'Professional or Facility access only' });
    }

    const result = await query(
      `SELECT sd.*, sb.ref_id AS booking_ref, sb.shift_id,
              s.role AS shift_role, s.start_time, s.location
       FROM shift_disputes sd
       JOIN shift_bookings sb ON sb.id = sd.booking_id
       JOIN shifts s ON s.id = sb.shift_id
       WHERE sd.raised_by = $1
       ORDER BY sd.created_at DESC`,
      [req.user!.id]
    );

    res.json({ disputes: result.rows });
  } catch (err) {
    console.error('My disputes error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ── GET /api/staffing/disputes — Admin: all disputes ─────────
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { status, limit = '50', offset = '0' } = req.query as any;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`sd.status = $${idx++}`); params.push(status); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(
      `SELECT sd.*, sb.ref_id AS booking_ref, sb.wage_amount,
              s.role AS shift_role, s.start_time,
              u_raiser.name AS raised_by_name, u_raiser.email AS raised_by_email
       FROM shift_disputes sd
       JOIN shift_bookings sb ON sb.id = sd.booking_id
       JOIN shifts s ON s.id = sb.shift_id
       JOIN users u_raiser ON u_raiser.id = sd.raised_by
       ${whereClause}
       ORDER BY sd.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({ disputes: result.rows });
  } catch (err) {
    console.error('Admin disputes error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ── PUT /api/staffing/disputes/:id — Admin resolves dispute ──
//
// Beyond flipping the status, this now actually moves the escrowed funds:
//   • outcome 'release' → pay the professional (complete booking, credit wallet)
//   • outcome 'refund'  → refund the facility via Stripe, mark escrow refunded
//   • outcome 'none'    → just close the dispute (e.g. dismissed) with no money movement
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    if (req.user!.role !== 'admin') {
      client.release();
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { status, resolutionNotes, outcome = 'none' } = req.body;
    if (!status || !['resolved', 'dismissed'].includes(status)) {
      client.release();
      return res.status(400).json({ error: 'Invalid status. Must be resolved or dismissed.' });
    }
    if (!['release', 'refund', 'none'].includes(outcome)) {
      client.release();
      return res.status(400).json({ error: 'Invalid outcome. Must be release, refund, or none.' });
    }

    await client.query('BEGIN');

    const dRes = await client.query(
      `SELECT sd.*, sb.id AS booking_id, sb.wage_amount, sb.platform_fee_amount, sb.total_charged,
              sb.stripe_payment_intent_id, sb.ref_id AS booking_ref, sb.shift_id,
              pp.user_id AS pro_user_id, fp.user_id AS facility_user_id
       FROM shift_disputes sd
       JOIN shift_bookings sb ON sb.id = sd.booking_id
       JOIN professional_profiles pp ON pp.id = sb.professional_id
       JOIN facility_profiles fp ON fp.id = sb.facility_id
       WHERE sd.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (dRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Dispute not found' });
    }
    const d = dRes.rows[0];

    // Update the dispute record
    const updated = await client.query(
      `UPDATE shift_disputes SET status = $1, resolution_notes = $2, resolved_at = NOW(),
         resolved_by = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [status, resolutionNotes || null, req.user!.id, req.params.id]
    );

    let moneyMessage = '';

    if (outcome === 'release') {
      const wage = parseFloat(d.wage_amount);
      await client.query(
        `UPDATE shift_escrow SET status = 'released', released_at = NOW(), released_to = $1 WHERE booking_id = $2 AND status IN ('holding','disputed')`,
        [d.pro_user_id, d.booking_id]
      );
      const w = await client.query(
        `INSERT INTO professional_wallets (user_id, balance, total_earned) VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = professional_wallets.balance + $2,
           total_earned = professional_wallets.total_earned + $2, updated_at = NOW() RETURNING balance`,
        [d.pro_user_id, wage]
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, booking_id)
         VALUES ($1, 'credit', $2, $3, $4, $5)`,
        [d.pro_user_id, wage, w.rows[0].balance, `Dispute resolved in your favor: ${d.booking_ref}`, d.booking_id]
      );
      await client.query(`UPDATE shift_bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`, [d.booking_id]);
      await client.query(`UPDATE shifts SET status = 'completed', updated_at = NOW() WHERE id = $1`, [d.shift_id]);
      moneyMessage = `$${wage.toFixed(2)} released to the professional.`;
    } else if (outcome === 'refund') {
      // Refund the facility via Stripe (best-effort; escrow marked refunded regardless).
      if (d.stripe_payment_intent_id) {
        try {
          const stripe = await getUncachableStripeClient();
          await stripe.refunds.create({ payment_intent: d.stripe_payment_intent_id });
        } catch (e: any) {
          console.error('[dispute] Stripe refund failed:', e?.message);
        }
      }
      await client.query(
        `UPDATE shift_escrow SET status = 'refunded', released_at = NOW() WHERE booking_id = $1 AND status IN ('holding','disputed')`,
        [d.booking_id]
      );
      await client.query(`UPDATE shift_bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [d.booking_id]);
      moneyMessage = `$${parseFloat(d.total_charged).toFixed(2)} refunded to the facility.`;
    }

    await client.query('COMMIT');

    // Notify both parties (in-app + email), best-effort.
    const recipients = await query(
      `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
      [[d.pro_user_id, d.facility_user_id]]
    );
    for (const u of recipients.rows) {
      await supabase.channel(`notifications:${u.id}`).send({
        type: 'broadcast',
        event: 'new_notification',
        payload: { title: 'Dispute resolved', content: `Dispute ${d.booking_ref} ${status}. ${moneyMessage}` },
      }).catch(() => {});
      await enqueueEmail('generic-notification', u.email, {
        name: u.name,
        subject: 'Your dispute has been resolved',
        heading: 'Dispute resolved',
        message: `Dispute for booking ${d.booking_ref} was ${status}. ${moneyMessage} ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`.trim(),
      }).catch(() => {});
    }
    if (d.pro_user_id && outcome === 'release') {
      await supabase.channel(`wallet:${d.pro_user_id}`).send({
        type: 'broadcast', event: 'balance_updated', payload: {},
      }).catch(() => {});
    }

    res.json({ dispute: updated.rows[0], message: `Dispute ${status}. ${moneyMessage}`.trim() });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Resolve dispute error:', err);
    res.status(500).json({ error: 'Failed to update dispute' });
  } finally {
    client.release();
  }
});

export default router;
