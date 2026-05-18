import { Router } from 'express';
import { query } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// ── GET /api/staffing/facilities/me ──────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }
    const result = await query(
      `SELECT fp.*, u.name, u.email, u.photo_url, u.status AS account_status
       FROM facility_profiles fp
       JOIN users u ON u.id = fp.user_id
       WHERE fp.user_id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Facility me error:', err);
    res.status(500).json({ error: 'Failed to fetch facility profile' });
  }
});

// ── POST /api/staffing/facilities/register ────────────────────
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }
    const {
      facilityName, facilityType, ein, address, city, state, zip,
      phone, contactName, contactTitle, website,
    } = req.body;

    if (!facilityName || !facilityType || !address || !city || !state || !zip) {
      return res.status(400).json({ error: 'Facility name, type, and address are required' });
    }

    const result = await query(
      `INSERT INTO facility_profiles
         (user_id, facility_name, facility_type, ein, address, city, state, zip,
          phone, contact_name, contact_title, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id) DO UPDATE SET
         facility_name = EXCLUDED.facility_name,
         facility_type = EXCLUDED.facility_type,
         ein = EXCLUDED.ein,
         address = EXCLUDED.address,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         zip = EXCLUDED.zip,
         phone = EXCLUDED.phone,
         contact_name = EXCLUDED.contact_name,
         contact_title = EXCLUDED.contact_title,
         website = EXCLUDED.website,
         updated_at = NOW()
       RETURNING *`,
      [
        req.user!.id, facilityName, facilityType, ein || null,
        address, city, state, zip,
        phone || null, contactName || null, contactTitle || null, website || null,
      ]
    );

    // Add to staffing verification queue
    await query(
      `INSERT INTO staffing_verification_queue (entity_type, entity_id, user_id)
       VALUES ('facility', $1, $2)
       ON CONFLICT DO NOTHING`,
      [result.rows[0].id, req.user!.id]
    ).catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Facility register error:', err);
    res.status(500).json({ error: 'Failed to create facility profile' });
  }
});

// ── PUT /api/staffing/facilities/profile ──────────────────────
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }
    const {
      facilityName, facilityType, ein, address, city, state, zip,
      phone, contactName, contactTitle, website,
    } = req.body;

    const result = await query(
      `UPDATE facility_profiles SET
         facility_name = COALESCE($1, facility_name),
         facility_type = COALESCE($2, facility_type),
         ein = COALESCE($3, ein),
         address = COALESCE($4, address),
         city = COALESCE($5, city),
         state = COALESCE($6, state),
         zip = COALESCE($7, zip),
         phone = COALESCE($8, phone),
         contact_name = COALESCE($9, contact_name),
         contact_title = COALESCE($10, contact_title),
         website = COALESCE($11, website),
         updated_at = NOW()
       WHERE user_id = $12
       RETURNING *`,
      [
        facilityName, facilityType, ein, address, city, state, zip,
        phone, contactName, contactTitle, website, req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Facility profile update error:', err);
    res.status(500).json({ error: 'Failed to update facility profile' });
  }
});

// ── GET /api/staffing/facilities/:id — public profile ──────────
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT fp.id, fp.facility_name, fp.facility_type, fp.address, fp.city,
              fp.state, fp.zip, fp.phone, fp.website, fp.verification_status,
              u.name, u.photo_url
       FROM facility_profiles fp
       JOIN users u ON u.id = fp.user_id
       WHERE fp.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get facility error:', err);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

export default router;
