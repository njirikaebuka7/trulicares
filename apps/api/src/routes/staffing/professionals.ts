import { Router } from 'express';
import { query } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { encryptPII, encryptArray } from '../../services/pii.js';

const router = Router();

// ── GET /api/staffing/professionals/me ────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const result = await query(
      `SELECT pp.*, u.name, u.email, u.phone, u.photo_url, u.status AS account_status,
              (SELECT json_agg(pl.* ORDER BY pl.created_at) FROM professional_licenses pl WHERE pl.professional_id = pp.id) AS licenses
       FROM professional_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }
    // Don't ship encrypted identity blobs back to the client — expose booleans instead.
    const { govt_id_docs, govt_id_number, background_check_details, ...safe } = result.rows[0];
    res.json({
      ...safe,
      govt_id_submitted: !!(Array.isArray(govt_id_docs) ? govt_id_docs.length : govt_id_docs) || !!govt_id_number,
      background_check_submitted: !!background_check_details,
    });
  } catch (err) {
    console.error('Professional me error:', err);
    res.status(500).json({ error: 'Failed to fetch professional profile' });
  }
});

// ── POST /api/staffing/professionals/register ─────────────────
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const {
      licenseType, licenseNumber, licenseState, licenseExpiry,
      licenses, roles,
      specialties, yearsExperience, bio, location, preferredRadiusMiles,
    } = req.body;

    // Support both old licenseType and new roles array
    const primaryRole = licenseType || (Array.isArray(roles) && roles[0]) || 'Other';

    if (!primaryRole) {
      return res.status(400).json({ error: 'Role selection is required' });
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
        primaryRole,
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

    // Save multiple roles as licenses if provided
    const rolesArr = Array.isArray(roles) ? roles : (Array.isArray(licenses) ? licenses : []);
    if (rolesArr.length > 0) {
      await query(`DELETE FROM professional_licenses WHERE professional_id = $1`, [proId]);
      for (const role of rolesArr) {
        const roleType = typeof role === 'string' ? role : role.type;
        if (!roleType) continue;
        await query(
          `INSERT INTO professional_licenses (professional_id, license_type, license_number, license_state, license_expiry, license_doc_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [proId, roleType, role.number || '', role.state || '', role.expiry || null, role.docUrl || null]
        );
      }
    } else if (licenses && Array.isArray(licenses)) {
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
    ).catch(() => {});

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
      // New extended fields
      workExperience, certifications, govtIdDocs, govtIdNumber, backgroundCheckDetails,
      roles,
    } = req.body;

    // Build dynamic update with only provided fields
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const addField = (colName: string, val: any) => {
      if (val !== undefined) {
        setClauses.push(`${colName} = $${idx++}`);
        values.push(val);
      }
    };

    addField('license_type', licenseType);
    addField('license_number', licenseNumber);
    addField('license_state', licenseState);
    addField('license_expiry', licenseExpiry);
    addField('specialties', specialties);
    addField('years_experience', yearsExperience);
    addField('bio', bio);
    addField('location', location);
    addField('preferred_radius_miles', preferredRadiusMiles);
    addField('license_doc_url', licenseDocUrl);
    addField('cert_doc_urls', certDocUrls);

    // Extended fields — stored as JSONB/text[] with graceful fallback
    if (workExperience !== undefined) {
      setClauses.push(`work_experience = $${idx++}`);
      values.push(JSON.stringify(workExperience));
    }
    if (certifications !== undefined) {
      setClauses.push(`certifications = $${idx++}`);
      values.push(certifications);
    }
    if (govtIdDocs !== undefined) {
      // Encrypt identity documents at rest (gov-ID images are sensitive PII).
      setClauses.push(`govt_id_docs = $${idx++}`);
      values.push(encryptArray(govtIdDocs) ?? govtIdDocs);
    }
    if (govtIdNumber !== undefined) {
      setClauses.push(`govt_id_number = $${idx++}`);
      values.push(encryptPII(govtIdNumber));
    }
    if (backgroundCheckDetails !== undefined) {
      setClauses.push(`background_check_details = $${idx++}`);
      values.push(encryptPII(JSON.stringify(backgroundCheckDetails)));
    }

    // Confirmed base location (from the location picker) → drives geo shift matching.
    const loc = (req.body as any).locationData;
    if (loc && typeof loc === 'object') {
      addField('latitude', Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null);
      addField('longitude', Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null);
      addField('city', loc.city ?? null);
      addField('state', loc.state ?? null);
      addField('zip_code', loc.zipCode ?? null);
      addField('country', loc.country ?? null);
      addField('formatted_address', loc.formattedAddress ?? null);
      addField('location_source', loc.locationSource ?? null);
      if (loc.formattedAddress) addField('location', loc.formattedAddress);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(req.user!.id);

    const result = await query(
      `UPDATE professional_profiles SET ${setClauses.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      values
    );

    const proId = result.rows[0]?.id;

    if (proId && Array.isArray(roles)) {
      await query(`DELETE FROM professional_licenses WHERE professional_id = $1`, [proId]);
      for (const role of roles) {
        const roleType = typeof role === 'string' ? role : role.type;
        if (!roleType) continue;
        await query(
          `INSERT INTO professional_licenses (professional_id, license_type, license_number, license_state, license_expiry, license_doc_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [proId, roleType, role.number || '', role.state || '', role.expiry || null, role.docUrl || null]
        );
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Professional profile update error:', err);
    // If columns don't exist yet, try a fallback minimal update
    try {
      const { bio, location, specialties, yearsExperience, preferredRadiusMiles, licenseType } = (req as any).body;
      const fallback = await query(
        `UPDATE professional_profiles SET
           bio = COALESCE($1, bio),
           location = COALESCE($2, location),
           specialties = COALESCE($3, specialties),
           years_experience = COALESCE($4, years_experience),
           preferred_radius_miles = COALESCE($5, preferred_radius_miles),
           license_type = COALESCE($6, license_type),
           updated_at = NOW()
         WHERE user_id = $7
         RETURNING *`,
        [bio, location, specialties, yearsExperience, preferredRadiusMiles, licenseType, (req as any).user!.id]
      );
      return res.json(fallback.rows[0] || {});
    } catch (fallbackErr) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
});

// ── POST /api/staffing/professionals/govt-id ─────────────────
// Submit government ID documents for verification
router.post('/govt-id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const { idFrontUrl, idBackUrl, selfieUrl, idNumber } = req.body;

    const docs: string[] = [];
    if (idFrontUrl) docs.push(`ID Front: ${idFrontUrl}`);
    if (idBackUrl) docs.push(`ID Back: ${idBackUrl}`);
    if (selfieUrl) docs.push(`Selfie: ${selfieUrl}`);

    // Encrypt the document blobs + ID number at rest. Admin review decrypts transparently.
    const encDocs = encryptArray(docs) ?? docs;
    const encIdNumber = encryptPII(idNumber || null);

    // Try to update with new columns; fallback gracefully
    try {
      await query(
        `UPDATE professional_profiles SET
           govt_id_docs = $1,
           govt_id_number = $2,
           updated_at = NOW()
         WHERE user_id = $3`,
        [encDocs, encIdNumber, req.user!.id]
      );
    } catch {
      // Columns may not exist yet — ignore
    }

    // Get pro profile id for verification queue
    const proResult = await query(
      `SELECT id FROM professional_profiles WHERE user_id = $1`,
      [req.user!.id]
    );
    if (proResult.rows.length > 0) {
      const proId = proResult.rows[0].id;
      await query(
        `INSERT INTO staffing_verification_queue (entity_type, entity_id, user_id, specialty, documents, id_card_number)
         VALUES ('professional', $1, $2, 'Government ID', $3, $4)
         ON CONFLICT DO NOTHING`,
        [proId, req.user!.id, encDocs, encIdNumber]
      ).catch(() => {});
    }

    res.json({ success: true, message: 'Government ID submitted for review' });
  } catch (err) {
    console.error('Professional govt-id error:', err);
    res.status(500).json({ error: 'Failed to submit government ID' });
  }
});

// ── POST /api/staffing/professionals/background-check ────────
router.post('/background-check', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }
    const { details } = req.body;
    // SECURITY: never persist a raw SSN. The real identity/SSN check is performed by our
    // screening partner (Checkr) on its hosted form — TruliCares never stores it.
    const { ssn: _ssn, socialSecurityNumber: _ssn2, ...safeDetails } = details || {};

    // Encrypt the detail blob at rest (contains DOB, legal name, address).
    const encDetails = encryptPII(JSON.stringify(safeDetails));

    try {
      await query(
        `UPDATE professional_profiles SET
           background_check_details = $1,
           background_check_status = 'pending',
           updated_at = NOW()
         WHERE user_id = $2`,
        [encDetails, req.user!.id]
      );
    } catch {
      // Column may not exist — ignore
    }

    const proResult = await query(
      `SELECT id FROM professional_profiles WHERE user_id = $1`,
      [req.user!.id]
    );
    if (proResult.rows.length > 0) {
      const proId = proResult.rows[0].id;
      const summaryDocs = [
        safeDetails.legalName ? `Legal Name: ${safeDetails.legalName}` : null,
        safeDetails.dob ? `Date of Birth: ${safeDetails.dob}` : null,
        safeDetails.currentAddress ? `Address: ${safeDetails.currentAddress}` : null,
      ].filter(Boolean) as string[];

      await query(
        `INSERT INTO staffing_verification_queue (entity_type, entity_id, user_id, specialty, documents, background_check_details)
         VALUES ('professional', $1, $2, 'Background Check', $3, $4)
         ON CONFLICT DO NOTHING`,
        [proId, req.user!.id, encryptArray(summaryDocs) ?? summaryDocs, encDetails]
      ).catch(() => {});
    }

    res.json({ success: true, message: 'Background check submitted for review' });
  } catch (err) {
    console.error('Professional background-check error:', err);
    res.status(500).json({ error: 'Failed to submit background check' });
  }
});

// ── GET /api/staffing/professionals/:id — Public profile (no PII) ───────
// Returns only non-sensitive fields. License NUMBERS, email, phone and ID/background
// docs are never exposed here — the owner uses /me; facilities see applicant details
// for THEIR shifts via the applications endpoint.
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT pp.id, pp.license_type, pp.license_state,
              pp.specialties, pp.years_experience, pp.bio, pp.location,
              pp.verification_status, pp.background_check_status,
              pp.avg_rating, pp.rating_count, pp.completed_shifts,
              u.name, u.photo_url
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
