import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/reviews — for the authenticated caregiver or by caregiverId param
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, role } = req.user!;
    const caregiverId = role === 'caregiver' ? id : (req.query.caregiverId as string || id);

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const result = await query(
      `SELECT r.id, r.rating, r.text, r.service, r.created_at,
              u.name as reviewer_name, u.photo_url as reviewer_photo
       FROM reviews r
       JOIN users u ON u.id = r.family_id
       WHERE r.caregiver_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [caregiverId, limit, offset]
    );

    const reviews = result.rows.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      service: r.service,
      reviewerName: r.reviewer_name,
      reviewerPhoto: r.reviewer_photo,
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      createdAt: r.created_at,
    }));

    // True totals from an aggregate (not just the current page)
    const agg = await query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0) AS avg FROM reviews WHERE caregiver_id = $1`,
      [caregiverId]
    );
    const count = agg.rows[0]?.count ?? 0;
    const averageRating = parseFloat(parseFloat(agg.rows[0]?.avg ?? 0).toFixed(1));

    res.json({ reviews, averageRating, count });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews
router.post('/', requireAuth, writeLimiter, async (req: AuthRequest, res) => {
  try {
    const { id: userId, role } = req.user!;
    const { caregiverId, rating, text, service } = req.body;

    // Only families can review, and only caregivers they've actually engaged with.
    if (role !== 'family') {
      return res.status(403).json({ error: 'Only families can leave reviews' });
    }
    if (!caregiverId || !rating) {
      return res.status(400).json({ error: 'caregiverId and rating are required' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Eligibility: there must be an accepted match between this family and caregiver.
    const rel = await query(
      `SELECT 1 FROM matches WHERE family_id = $1 AND caregiver_id = $2 AND status = 'accepted' LIMIT 1`,
      [userId, caregiverId]
    );
    if (rel.rows.length === 0) {
      return res.status(403).json({ error: 'You can only review a caregiver you have worked with.' });
    }

    // One review per family↔caregiver — update the existing one instead of erroring/stuffing.
    const result = await query(
      `INSERT INTO reviews (caregiver_id, family_id, rating, text, service)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (caregiver_id, family_id) DO UPDATE
         SET rating = EXCLUDED.rating, text = EXCLUDED.text, service = EXCLUDED.service, created_at = NOW()
       RETURNING id, rating, text, service, created_at`,
      [caregiverId, userId, ratingNum, text || '', service || '']
    );

    // Update caregiver's average rating
    await query(
      `UPDATE caregiver_profiles SET
         rating = (SELECT AVG(rating)::decimal(3,2) FROM reviews WHERE caregiver_id = $1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE caregiver_id = $1)
       WHERE user_id = $1`,
      [caregiverId]
    );

    // Invalidate caregiver list cache to update rating dynamically
    try {
      const { invalidateCache } = await import('../services/cache.js');
      invalidateCache('caregivers:');
    } catch (cacheErr) {
      console.error('Failed to invalidate caregivers cache on review post:', cacheErr);
    }

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export default router;
