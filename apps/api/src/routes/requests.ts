import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createMatchesForRequest, refreshFamilyMatches } from '../services/matching.js';
import { sendJobRequestNotification } from '../services/email.js';
import { generateRefId } from '../services/utils.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function pageParams(req: AuthRequest, defLimit = 50, maxLimit = 100) {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? defLimit), 10) || defLimit, 1), maxLimit);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
  return { limit, offset };
}

const careTypeLabels: Record<string, string> = {
  'child-care': 'Child Care',
  'senior-care': 'Senior Care',
  'adult-care': 'Adult Care',
  'cleaning': 'Cleaning Services',
};

function formatRequest(row: any) {
  const details = row.details || {};
  return {
    id: row.id,
    category: row.care_type,
    label: careTypeLabels[row.care_type] || row.care_type,
    description: details.schedule
      ? `${details.numberOfChildren ? `${details.numberOfChildren} children, ` : ''}${details.schedule}`
      : row.location || '',
    status: row.status,
    matchCount: parseInt(row.match_count) || 0,
    postedDate: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    budget: details.budget || '',
    location: row.location || '',
    careType: row.care_type,
    details: row.details || {},
    createdAt: row.created_at,
  };
}

// POST /api/care-requests
router.post('/', requireAuth, writeLimiter, async (req: AuthRequest, res) => {
  try {
    const { careType, details, location, zip, caregiverId, locationData } = req.body;
    if (!careType) return res.status(400).json({ error: 'Care type is required' });

    const userCheck = await query('SELECT status FROM users WHERE id = $1', [req.user!.id]);
    if (userCheck.rows[0]?.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is suspended. You cannot create new care requests.' });
    }

    // Normalized, confirmed location (from the location picker). Coordinates drive geo matching.
    const loc = locationData || {};
    const lat = Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null;
    const lng = Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null;
    const locationStr = location || loc.formattedAddress || '';
    const zipStr = zip || loc.zipCode || '';

    const refId = generateRefId('REQ');
    const result = await query(
      `INSERT INTO care_requests
        (family_id, care_type, details, location, zip, status, ref_id,
         latitude, longitude, address, city, state, zip_code, country, formatted_address, location_source)
       VALUES ($1, $2, $3, $4, $5, 'matching', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, care_type, details, location, zip, status, created_at, ref_id`,
      [
        req.user!.id, careType, details || {}, locationStr, zipStr, refId,
        lat, lng, loc.address || null, loc.city || null, loc.state || null,
        loc.zipCode || null, loc.country || null, loc.formattedAddress || null, loc.locationSource || null,
      ]
    );

    const careRequest = result.rows[0];

    // Direct caregiver request: validate then create a single match immediately
    if (caregiverId) {
      // Validate the target user is an active caregiver offering this care type
      const cgCheck = await query(
        `SELECT u.id FROM users u
         JOIN caregiver_profiles cp ON cp.user_id = u.id
         WHERE u.id = $1 AND u.role = 'caregiver' AND u.status = 'active'
           AND ($2::text IS NULL OR $2 = ANY(cp.specialties))`,
        [caregiverId, careType || null]
      );
      if (cgCheck.rows.length === 0) {
        // Clean up the newly created request and return an error
        await query('DELETE FROM care_requests WHERE id = $1', [careRequest.id]);
        return res.status(400).json({ error: 'Caregiver not found or does not offer this care type' });
      }

      try {
        const sesRefId = generateRefId('SES');
        const matchResult = await query(
          `INSERT INTO matches (family_id, caregiver_id, request_id, status, ref_id)
           VALUES ($1, $2, $3, 'pending', $4)
           RETURNING id`,
          [req.user!.id, caregiverId, careRequest.id, sesRefId]
        );
        await query(`UPDATE care_requests SET status = 'matched' WHERE id = $1`, [careRequest.id]);

        // Notify caregiver of direct request
        const familyName = req.user!.name || 'A family';
        await query(
          `INSERT INTO notifications (user_id, title, content, type)
           VALUES ($1, $2, $3, 'match_request')`,
          [caregiverId, 'New Care Request Direct Match', `${familyName} has sent you a direct care request. Check your Job Requests.`]
        ).catch(err => console.error('Error inserting notification:', err));

        return res.status(201).json({
          request: formatRequest(careRequest),
          matchId: matchResult.rows[0].id,
          message: 'Care request submitted directly to caregiver.',
        });
      } catch (matchErr) {
        console.error('Direct match creation error:', matchErr);
        await query('DELETE FROM care_requests WHERE id = $1', [careRequest.id]);
        return res.status(500).json({ error: 'Failed to create direct match. Please try again.' });
      }
    }

    createMatchesForRequest(careRequest.id, req.user!.id, careType, location, zip)
      .then(async (matches) => {
        await query(`UPDATE care_requests SET status = 'matched' WHERE id = $1`, [careRequest.id]);

        const familyResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
        const familyName = familyResult.rows[0]?.name || 'A family';

        // Batch-fetch the top caregivers' contact info in ONE query (no N+1)
        const topIds = matches.slice(0, 3).map((m) => m.id);
        if (topIds.length > 0) {
          const r = await query('SELECT email, name FROM users WHERE id = ANY($1)', [topIds]);
          for (const cg of r.rows) {
            sendJobRequestNotification(cg.email, cg.name, familyName, careType).catch(console.error);
          }
        }
      })
      .catch(console.error);

    res.status(201).json({ request: formatRequest(careRequest), message: 'Care request submitted. Finding matches…' });
  } catch (err) {
    console.error('Create care request error:', err);
    res.status(500).json({ error: 'Failed to create care request' });
  }
});

// GET /api/care-requests
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    let result;

    const { limit, offset } = pageParams(req);
    if (req.user!.role === 'family') {
      // Top up matches — throttled (≤ once / 10 min per family), not on every poll.
      await refreshFamilyMatches(req.user!.id).catch((e) => console.error('refreshFamilyMatches:', e?.message));

      result = await query(
        `SELECT cr.id, cr.care_type, cr.details, cr.location, cr.zip, cr.status, cr.created_at, cr.ref_id,
                COUNT(m.id) as match_count
         FROM care_requests cr
         LEFT JOIN matches m ON m.request_id = cr.id
         WHERE cr.family_id = $1
         GROUP BY cr.id
         ORDER BY cr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user!.id, limit, offset]
      );
    } else {
      result = await query(
        `SELECT cr.id, cr.care_type, cr.details, cr.location, cr.zip, cr.status, cr.created_at, cr.ref_id,
                u.name as family_name
         FROM care_requests cr
         JOIN matches m ON m.request_id = cr.id AND m.caregiver_id = $1
         JOIN users u ON u.id = cr.family_id
         ORDER BY cr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user!.id, limit, offset]
      );
    }

    res.json({ requests: result.rows.map(formatRequest) });
  } catch (err) {
    console.error('Get care requests error:', err);
    res.status(500).json({ error: 'Failed to fetch care requests' });
  }
});

// GET /api/care-requests/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT cr.*, u.name as family_name,
              (SELECT COUNT(*) FROM matches WHERE request_id=cr.id) as match_count
       FROM care_requests cr
       JOIN users u ON u.id = cr.family_id
       WHERE cr.id = $1 AND (cr.family_id = $2 OR $3 = 'admin')`,
      [req.params.id, req.user!.id, req.user!.role]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: formatRequest(result.rows[0]) });
  } catch (err) {
    console.error('Get care request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// PUT /api/care-requests/:id — edit location / details
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { location, details } = req.body;
    const result = await query(
      `UPDATE care_requests
       SET location = COALESCE($1, location),
           details  = COALESCE($2, details)
       WHERE id = $3 AND family_id = $4 AND status NOT IN ('cancelled','completed')
       RETURNING *`,
      [location ?? null, details ? JSON.stringify(details) : null, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found or cannot be edited' });
    const count = await query('SELECT COUNT(*) as c FROM matches WHERE request_id = $1', [req.params.id]);
    const row = { ...result.rows[0], match_count: count.rows[0]?.c ?? 0 };
    res.json({ request: formatRequest(row) });
  } catch (err) {
    console.error('Edit care request error:', err);
    res.status(500).json({ error: 'Failed to update care request' });
  }
});

// PUT /api/care-requests/:id/cancel
router.put('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE care_requests SET status = 'cancelled'
       WHERE id = $1 AND family_id = $2 AND status NOT IN ('cancelled','completed')
       RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found or already closed' });
    res.json({ request: formatRequest(result.rows[0]) });
  } catch (err) {
    console.error('Cancel care request error:', err);
    res.status(500).json({ error: 'Failed to cancel care request' });
  }
});

export default router;
