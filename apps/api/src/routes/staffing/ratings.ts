import { Router } from 'express';
import { query, getClient } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

/**
 * Two-way ratings: after a completed booking, the facility rates the professional and the
 * professional rates the facility. Each rating updates the ratee's rolling average + count
 * which, together with completion/no-show/cancellation counters, forms a reliability score.
 */

// ── POST /api/staffing/ratings — submit a rating for a completed booking ──
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    const role = req.user!.role;
    if (role !== 'professional' && role !== 'facility') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { bookingId, rating, comment } = req.body || {};
    const stars = parseInt(rating, 10);
    if (!bookingId || !(stars >= 1 && stars <= 5)) {
      return res.status(400).json({ error: 'A booking and a rating between 1 and 5 are required' });
    }

    // Load booking + both parties, ensuring the requester is part of it and it's completed.
    const bRes = await query(
      `SELECT sb.id, sb.status, pp.id AS pro_id, pp.user_id AS pro_user_id,
              fp.id AS fac_id, fp.user_id AS facility_user_id
       FROM shift_bookings sb
       JOIN professional_profiles pp ON pp.id = sb.professional_id
       JOIN facility_profiles fp ON fp.id = sb.facility_id
       WHERE sb.id = $1`,
      [bookingId]
    );
    if (bRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];

    const isParty = role === 'professional' ? b.pro_user_id === req.user!.id : b.facility_user_id === req.user!.id;
    if (!isParty) return res.status(403).json({ error: 'You are not part of this booking' });
    if (b.status !== 'completed') return res.status(400).json({ error: 'You can only rate a completed shift' });

    const rateeUserId = role === 'professional' ? b.facility_user_id : b.pro_user_id;

    await client.query('BEGIN');

    // One rating per (booking, role). Upsert so a re-submit edits the existing one.
    await client.query(
      `INSERT INTO shift_ratings (booking_id, rater_user_id, ratee_user_id, rater_role, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (booking_id, rater_role)
         DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()`,
      [bookingId, req.user!.id, rateeUserId, role, stars, comment || null]
    );

    // Recompute the ratee's rolling average from all ratings they've received.
    const agg = await client.query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*)::int AS count
       FROM shift_ratings WHERE ratee_user_id = $1`,
      [rateeUserId]
    );
    const avg = agg.rows[0].avg;
    const count = agg.rows[0].count;

    // Ratee is the opposite role of the rater.
    if (role === 'professional') {
      await client.query(
        `UPDATE facility_profiles SET avg_rating = $1, rating_count = $2 WHERE user_id = $3`,
        [avg, count, rateeUserId]
      );
    } else {
      await client.query(
        `UPDATE professional_profiles SET avg_rating = $1, rating_count = $2 WHERE user_id = $3`,
        [avg, count, rateeUserId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Thanks for your feedback!', avg, count });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit rating error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  } finally {
    client.release();
  }
});

// ── GET /api/staffing/ratings/booking/:bookingId — ratings on a booking ──
router.get('/booking/:bookingId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT rater_role, rating, comment, created_at FROM shift_ratings WHERE booking_id = $1`,
      [req.params.bookingId]
    );
    const mine = result.rows.find((r) => r.rater_role === req.user!.role) || null;
    res.json({ ratings: result.rows, mine });
  } catch (err) {
    console.error('Get booking ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

export default router;
