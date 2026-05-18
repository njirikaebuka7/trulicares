import { Router } from 'express';
import { query } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

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
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { status, resolutionNotes } = req.body;
    if (!status || !['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be resolved or dismissed.' });
    }

    const result = await query(
      `UPDATE shift_disputes SET
         status = $1,
         resolution_notes = $2,
         resolved_at = NOW(),
         resolved_by = $3,
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, resolutionNotes || null, req.user!.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json({ dispute: result.rows[0], message: `Dispute ${status}` });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    res.status(500).json({ error: 'Failed to update dispute' });
  }
});

export default router;
