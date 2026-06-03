import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createMatchesForRequest } from '../services/matching.js';

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
    refId: row.ref_id || '',
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
    familyEmail: row.family_email || '',
    familyPhone: row.family_phone || '',
    familyPhoto: row.family_photo || null,
    refId: row.ref_id || '',
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
      // Auto-generate/update matches for active requests first
      try {
        const activeRequests = await query(
          `SELECT id, care_type, location, zip FROM care_requests 
           WHERE family_id = $1 AND status IN ('matching', 'matched')`,
          [id]
        );
        for (const reqRow of activeRequests.rows) {
          await createMatchesForRequest(reqRow.id, id, reqRow.care_type, reqRow.location || undefined, reqRow.zip || undefined);
        }
      } catch (matchErr) {
        console.error('Error auto-generating matches on GET /api/matches:', matchErr);
      }

      const result = await query(
        `SELECT m.id, m.request_id, m.caregiver_id, m.family_id, m.status,
                m.near_you, m.messaging_unlocked, m.care_date, m.created_at,
                uc.name as caregiver_name, uc.photo_url as caregiver_photo, uc.email as caregiver_email,
                cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
                cp.rating, cp.review_count, cp.verified, cp.background_checked,
                cp.years_experience, cp.availability, cp.location as caregiver_location,
                cp.service_zips,
                cr.care_type, cr.location as request_location, cr.ref_id
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
                uf.name as family_name, uf.photo_url as family_photo, uf.email as family_email, uf.phone as family_phone,
                cr.care_type, cr.location as request_location, cr.details, cr.ref_id,
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

    const userCheck = await query('SELECT status FROM users WHERE id = $1', [userId]);
    if (userCheck.rows[0]?.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    }

    const result = await query(
      `UPDATE matches SET status = 'pending' 
       WHERE id = $1 AND family_id = $2 AND status = 'matching' 
       RETURNING *`,
      [req.params.id, userId]
    );

    const match = result.rows[0];
    const familyName = req.user!.name || 'A family';
    await query(
      `INSERT INTO notifications (user_id, title, content, type)
       VALUES ($1, $2, $3, 'match_request')`,
      [match.caregiver_id, 'New Caregiver Request', `${familyName} is requesting your services. Check your Job Requests.`]
    ).catch(err => console.error('Error inserting notification:', err));

    res.json({ match, message: 'Request sent to caregiver' });
  } catch (err) {
    console.error('Request caregiver error:', err);
    res.status(500).json({ error: 'Failed to request caregiver' });
  }
});

// PUT /api/matches/:id/accept
router.put('/:id/accept', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userCheck = await query('SELECT status FROM users WHERE id = $1', [req.user!.id]);
    if (userCheck.rows[0]?.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    }
    const result = await query(
      `UPDATE matches SET status = 'accepted' WHERE id = $1 AND caregiver_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    
    const match = result.rows[0];
    const caregiverResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
    const caregiverName = caregiverResult.rows[0]?.name || 'Your selected caregiver';
    await query(
      `INSERT INTO notifications (user_id, title, content, type)
       VALUES ($1, $2, $3, 'match_accepted')`,
      [match.family_id, 'Match Accepted!', `${caregiverName} has accepted your care request. Go to your Matches to unlock messaging.`]
    ).catch(err => console.error('Error inserting notification:', err));

    res.json({ match });
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
    
    const match = result.rows[0];
    const caregiverResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
    const caregiverName = caregiverResult.rows[0]?.name || 'Your selected caregiver';
    await query(
      `INSERT INTO notifications (user_id, title, content, type)
       VALUES ($1, $2, $3, 'match_declined')`,
      [match.family_id, 'Match Declined', `${caregiverName} was unable to accept your care request. You can browse other available caregivers.`]
    ).catch(err => console.error('Error inserting notification:', err));

    res.json({ match });
  } catch (err) {
    console.error('Decline match error:', err);
    res.status(500).json({ error: 'Failed to decline match' });
  }
});

// POST /api/matches/:id/unlock-messaging
//
// SECURITY: messaging is paid ($9.99). This endpoint must NOT unlock for free. We require
// proof of payment — either a succeeded `payments` row (set by the Stripe webhook) OR a
// Stripe-verified checkout session passed as `sessionId` (works even if the webhook isn't
// configured). A direct call with neither is rejected with 402.
router.post('/:id/unlock-messaging', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const { sessionId } = req.body || {};

    const matchRow = await query(`SELECT * FROM matches WHERE id = $1 AND family_id = $2`, [req.params.id, userId]);
    if (matchRow.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRow.rows[0];
    const wasUnlocked = !!match.messaging_unlocked;

    if (!wasUnlocked) {
      let paid = false;

      // 1. Webhook path — a succeeded payment is recorded for this match
      const paidRow = await query(
        `SELECT 1 FROM payments WHERE match_id = $1 AND user_id = $2 AND status = 'succeeded' LIMIT 1`,
        [req.params.id, userId]
      );
      if (paidRow.rows.length > 0) paid = true;

      // 2. Fallback — verify the Stripe checkout session directly (no webhook needed)
      if (!paid && sessionId) {
        try {
          const { getUncachableStripeClient } = await import('../stripeClient.js');
          const stripe = await getUncachableStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (
            session.payment_status === 'paid' &&
            session.metadata?.type === 'unlock' &&
            session.metadata?.matchId === req.params.id &&
            session.metadata?.userId === userId
          ) {
            paid = true;
            await query(
              `UPDATE payments SET status = 'succeeded', stripe_payment_intent_id = $1
               WHERE match_id = $2 AND user_id = $3 AND status = 'pending'`,
              [session.payment_intent || session.id, req.params.id, userId]
            );
          }
        } catch (e: any) {
          console.error('Unlock: Stripe session verify failed:', e?.message);
        }
      }

      if (!paid) {
        return res.status(402).json({ error: 'Payment required to unlock messaging.' });
      }

      await query(
        `UPDATE matches SET messaging_unlocked = true, care_date = NULL WHERE id = $1 AND family_id = $2`,
        [req.params.id, userId]
      );
    }

    // Create/get conversation (idempotent)
    await query(
      `INSERT INTO conversations (family_id, caregiver_id, match_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, caregiver_id) DO UPDATE
         SET updated_at = NOW(),
             match_id = COALESCE(conversations.match_id, EXCLUDED.match_id)`,
      [userId, match.caregiver_id, match.id]
    );

    // Notify the caregiver only on the first unlock (avoid re-notifying on repeat calls)
    if (!wasUnlocked) {
      const familyName = req.user!.name || 'A family';
      await query(
        `INSERT INTO notifications (user_id, title, content, type)
         VALUES ($1, $2, $3, 'messaging_unlocked')`,
        [match.caregiver_id, 'Messaging Unlocked!', `${familyName} has unlocked direct messaging with you. Start the conversation now.`]
      ).catch(err => console.error('Error inserting notification:', err));
    }

    res.json({ match: { ...match, messaging_unlocked: true }, message: 'Messaging unlocked' });
  } catch (err) {
    console.error('Unlock messaging error:', err);
    res.status(500).json({ error: 'Failed to unlock messaging' });
  }
});

export default router;
