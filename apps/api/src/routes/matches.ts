import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function buildCaregiverProfile(row: any) {
  if (!row.caregiver_name) return null;
  return {
    id: row.caregiver_id,
    name: row.caregiver_name,
    email: row.caregiver_email || '',
    role: 'caregiver' as const,
    bio: row.bio || '',
    specialties: row.specialties || [],
    hourlyRate: [row.hourly_rate_min || 15, row.hourly_rate_max || 30] as [number, number],
    rating: parseFloat(row.rating) || 4.5,
    reviewCount: row.review_count || 0,
    location: row.caregiver_location || '',
    verified: row.verified || false,
    backgroundChecked: row.background_checked || false,
    yearsExperience: row.years_experience || 0,
    availability: row.availability || 'Flexible',
    photoUrl: row.caregiver_photo || undefined,
    serviceZips: row.service_zips || [],
  };
}

function formatFamilyMatch(row: any) {
  const caregiver = buildCaregiverProfile(row);
  const hr = caregiver?.hourlyRate;
  const careDate = row.care_date ? new Date(row.care_date) : null;
  const hoursElapsed = careDate ? (Date.now() - careDate.getTime()) / 3600000 : 0;
  const messagingUnlocked: boolean = (row.messaging_unlocked || false) && (!careDate || hoursElapsed <= 48);
  return {
    id: row.id,
    careRequestId: row.request_id || '',
    caregiver,
    caregiverId: row.caregiver_id,
    status: row.status,
    careType: row.care_type || '',
    budget: hr ? `$${hr[0]}–$${hr[1]}/hr` : '',
    location: row.request_location || caregiver?.location || '',
    messagingUnlocked,
    careDate: row.care_date || null,
    messagingExpired: (row.messaging_unlocked || false) && careDate && hoursElapsed > 48,
    nearYou: row.near_you || false,
  };
}

function formatCaregiverMatch(row: any) {
  return {
    id: row.id,
    familyId: row.family_id,
    familyName: row.family_name || '',
    familyPhoto: row.family_photo || null,
    careType: row.care_type || '',
    service: row.care_type || '',
    location: row.request_location || '',
    details: row.details || {},
    status: row.status,
    messagingUnlocked: row.messaging_unlocked || false,
    nearYou: row.near_you || false,
    createdAt: row.created_at,
    // For job request display
    budget: row.budget_str || '',
    postedAt: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
  };
}

// GET /api/matches
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, id } = req.user!;

    if (role === 'family') {
      const result = await query(
        `SELECT m.id, m.request_id, m.caregiver_id, m.family_id, m.status,
                m.near_you, m.messaging_unlocked, m.care_date, m.created_at,
                uc.name as caregiver_name, uc.photo_url as caregiver_photo, uc.email as caregiver_email,
                cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
                cp.rating, cp.review_count, cp.verified, cp.background_checked,
                cp.years_experience, cp.availability, cp.location as caregiver_location,
                cp.service_zips,
                cr.care_type, cr.location as request_location
         FROM matches m
         JOIN users uc ON uc.id = m.caregiver_id
         LEFT JOIN caregiver_profiles cp ON cp.user_id = m.caregiver_id
         LEFT JOIN care_requests cr ON cr.id = m.request_id
         WHERE m.family_id = $1 AND m.status != 'declined'
         ORDER BY m.near_you DESC, cp.rating DESC NULLS LAST, m.created_at DESC`,
        [id]
      );
      return res.json({ matches: result.rows.map(formatFamilyMatch) });
    }

    if (role === 'caregiver') {
      const result = await query(
        `SELECT m.id, m.request_id, m.caregiver_id, m.family_id, m.status,
                m.near_you, m.messaging_unlocked, m.created_at,
                uf.name as family_name, uf.photo_url as family_photo,
                cr.care_type, cr.location as request_location, cr.details,
                CONCAT('$', cp.hourly_rate_min, '–$', cp.hourly_rate_max, '/hr') as budget_str
         FROM matches m
         JOIN users uf ON uf.id = m.family_id
         LEFT JOIN care_requests cr ON cr.id = m.request_id
         LEFT JOIN caregiver_profiles cp ON cp.user_id = m.caregiver_id
         WHERE m.caregiver_id = $1 AND m.status != 'matching'
         ORDER BY m.created_at DESC`,
        [id]
      );
      return res.json({ matches: result.rows.map(formatCaregiverMatch) });
    }

    // Admin
    const result = await query(
      `SELECT m.*, uc.name as caregiver_name, uf.name as family_name, cr.care_type
       FROM matches m
       JOIN users uc ON uc.id = m.caregiver_id
       JOIN users uf ON uf.id = m.family_id
       LEFT JOIN care_requests cr ON cr.id = m.request_id
       ORDER BY m.created_at DESC LIMIT 100`
    );
    res.json({ matches: result.rows });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// POST /api/matches/:id/request
router.post('/:id/request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId, role } = req.user!;
    if (role !== 'family') return res.status(403).json({ error: 'Only families can request caregivers' });

    const result = await query(
      `UPDATE matches SET status = 'pending' 
       WHERE id = $1 AND family_id = $2 AND status = 'matching' 
       RETURNING *`,
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or already requested' });
    }

    res.json({ match: result.rows[0], message: 'Request sent to caregiver' });
  } catch (err) {
    console.error('Request caregiver error:', err);
    res.status(500).json({ error: 'Failed to request caregiver' });
  }
});

// PUT /api/matches/:id/accept
router.put('/:id/accept', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE matches SET status = 'accepted' WHERE id = $1 AND caregiver_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ match: result.rows[0] });
  } catch (err) {
    console.error('Accept match error:', err);
    res.status(500).json({ error: 'Failed to accept match' });
  }
});

// PUT /api/matches/:id/decline
router.put('/:id/decline', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE matches SET status = 'declined' WHERE id = $1 AND caregiver_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ match: result.rows[0] });
  } catch (err) {
    console.error('Decline match error:', err);
    res.status(500).json({ error: 'Failed to decline match' });
  }
});

// POST /api/matches/:id/unlock-messaging
router.post('/:id/unlock-messaging', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    // 1. Unlock the match
    const matchResult = await query(
      `UPDATE matches SET messaging_unlocked = true, care_date = NULL WHERE id = $1 AND family_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    if (matchResult.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchResult.rows[0];

    // 2. Create/get conversation
    await query(
      `INSERT INTO conversations (family_id, caregiver_id, match_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, caregiver_id) DO UPDATE
         SET updated_at = NOW(),
             match_id = COALESCE(conversations.match_id, EXCLUDED.match_id)`,
      [userId, match.caregiver_id, match.id]
    );

    // 3. Update payment status (fallback for missing webhook)
    await query(
      `UPDATE payments SET status = 'succeeded' WHERE match_id = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.id, userId]
    );

    res.json({ match, message: 'Messaging unlocked' });
  } catch (err) {
    console.error('Unlock messaging error:', err);
    res.status(500).json({ error: 'Failed to unlock messaging' });
  }
});

export default router;
