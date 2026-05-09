import { Router } from 'express';
import { query } from '../db.js';
import { requireCaregiver, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/clients  — returns families the caregiver has active/past matches with
router.get('/', requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT
         u.id, u.name, u.email, u.photo_url,
         m.id as match_id, m.status as match_status,
         m.messaging_unlocked, m.created_at as matched_at,
         cr.care_type, cr.location
       FROM matches m
       JOIN users u ON u.id = m.family_id
       LEFT JOIN care_requests cr ON cr.id = m.request_id
       WHERE m.caregiver_id = $1
       ORDER BY
         CASE WHEN m.status = 'accepted' THEN 0 ELSE 1 END,
         m.created_at DESC`,
      [req.user!.id]
    );

    const careTypeLabels: Record<string, string> = {
      'child-care': 'Child Care', 'senior-care': 'Senior Care',
      'adult-care': 'Adult Care', 'cleaning': 'Cleaning Services',
    };

    const clients = result.rows.map((r: any) => ({
      id: r.id,
      matchId: r.match_id,
      name: r.name,
      email: r.email,
      photoUrl: r.photo_url || null,
      careType: r.care_type,
      careTypeLabel: careTypeLabels[r.care_type] || r.care_type,
      status: r.match_status,
      active: r.match_status === 'accepted',
      location: r.location || '',
      messagingUnlocked: r.messaging_unlocked,
      matchedAt: r.matched_at
        ? new Date(r.matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '',
    }));

    res.json({ clients });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

export default router;
