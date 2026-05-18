import { Router } from 'express';
import { query } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// ── GET /api/staffing/professionals/me ────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const result = await query(
      `SELECT pp.*, u.name, u.email, u.phone, u.photo_url, u.status AS account_status,
              (SELECT json_agg(pl.*) FROM professional_licenses pl WHERE pl.professional_id = pp.id) AS licenses
       FROM professional_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Professional me error:', err);
    res.status(500).json({ error: 'Failed to fetch professional profile' });
  }
});

// ── POST /api/staffing/professionals/register ─────────────────
// Called after user account is already created with role='professional'
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const {
      licenseType, licenseNumber, licenseState, licenseExpiry,
      licenses,
      specialties, yearsExperience, bio, location, preferredRadiusMiles,
    } = req.body;

    if (!licenseType) {
      return res.status(400).json({ error: 'License type is required' });
    }

    // Upsert professional profile
    const result = await query(
      `INSERT INTO professional_profiles
         (user_id, license_type, license_number, license_state, license_expiry,
          specialties, years_experience, bio, location, preferred_radius_miles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id) DO UPDATE SET
         license_type = EXCLUDED.license_type,
         license_number = EXCLUDED.license_number,
         license_state = EXCLUDED.license_state,
         license_expiry = EXCLUDED.license_expiry,
         specialties = EXCLUDED.specialties,
         years_experience = EXCLUDED.years_experience,
         bio = EXCLUDED.bio,
         location = EXCLUDED.location,
         preferred_radius_miles = EXCLUDED.preferred_radius_miles,
         updated_at = NOW()
       RETURNING *`,
      [
        req.user!.id,
        licenseType,
        licenseNumber || null,
        licenseState || null,
        (licenseExpiry && licenseExpiry.trim() !== '') ? licenseExpiry : null,
        specialties || [],
        yearsExperience || 0,
        bio || '',
        location || '',
        preferredRadiusMiles || 25,
      ]
    );

    const proId = result.rows[0].id;

    // Save multiple licenses if provided
    if (licenses && Array.isArray(licenses)) {
      // Clear old ones if it's an update (optional but safer for onboarding)
      await query(`DELETE FROM professional_licenses WHERE professional_id = $1`, [proId]);
      
      for (const lic of licenses) {
        if (!lic.type) continue;
        await query(
          `INSERT INTO professional_licenses (professional_id, license_type, license_number, license_state, license_expiry, license_doc_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [proId, lic.type, lic.number || '', lic.state || '', lic.expiry || null, lic.docUrl || null]
        );
      }
    }

    // Add to staffing verification queue
    await query(
      `INSERT INTO staffing_verification_queue (entity_type, entity_id, user_id)
       VALUES ('professional', $1, $2)
       ON CONFLICT DO NOTHING`,
      [proId, req.user!.id]
    ).catch(() => {}); // ignore if already in queue

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Professional register error:', err);
    res.status(500).json({ error: 'Failed to create professional profile' });
  }
});

// ── PUT /api/staffing/professionals/profile ───────────────────
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const {
      licenseType, licenseNumber, licenseState, licenseExpiry,
      specialties, yearsExperience, bio, location, preferredRadiusMiles,
      licenseDocUrl, certDocUrls,
    } = req.body;

    const result = await query(
      `UPDATE professional_profiles SET
         license_type = COALESCE($1, license_type),
         license_number = COALESCE($2, license_number),
         license_state = COALESCE($3, license_state),
         license_expiry = COALESCE($4, license_expiry),
         specialties = COALESCE($5, specialties),
         years_experience = COALESCE($6, years_experience),
         bio = COALESCE($7, bio),
         location = COALESCE($8, location),
         preferred_radius_miles = COALESCE($9, preferred_radius_miles),
         license_doc_url = COALESCE($10, license_doc_url),
         cert_doc_urls = COALESCE($11, cert_doc_urls),
         updated_at = NOW()
       WHERE user_id = $12
       RETURNING *`,
      [
        licenseType, licenseNumber, licenseState, licenseExpiry,
        specialties, yearsExperience, bio, location, preferredRadiusMiles,
        licenseDocUrl, certDocUrls,
        req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Professional profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── GET /api/staffing/professionals/:id — Public profile ───────
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT pp.id, pp.license_type, pp.license_number, pp.license_state,
              pp.specialties, pp.years_experience, pp.bio, pp.location,
              pp.verification_status, pp.background_check_status,
              pp.cert_doc_urls, pp.license_doc_url,
              u.name, u.email, u.photo_url, u.phone
       FROM professional_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get professional error:', err);
    res.status(500).json({ error: 'Failed to fetch professional' });
  }
});

export default router;
