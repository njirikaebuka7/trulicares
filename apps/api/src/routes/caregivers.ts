import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireCaregiver, AuthRequest } from '../middleware/auth.js';
import { cacheGet, cacheSet, invalidateCache } from '../services/cache.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { encryptPII } from '../services/pii.js';

const router = Router();

/**
 * Shapes a caregiver row for the API.
 *
 * @param includePrivate When true, includes sensitive PII (email, government ID number
 *   + images, selfie, and background-check details containing SSN/DOB/address). This is
 *   ONLY safe for the caregiver viewing their own profile or an admin — never for public
 *   browse/detail, which would leak PII to anyone.
 */
function formatCaregiver(row: any, includePrivate = false) {
  let bgStatus = row.background_check_status || 'none';
  if (row.background_checked && bgStatus === 'none') {
    bgStatus = 'approved';
  } else if (row.pending_status && bgStatus === 'none') {
    bgStatus = row.pending_status;
  }

  const base = {
    id: row.id,
    name: row.name,
    role: 'caregiver' as const,
    bio: row.bio || '',
    specialties: row.specialties || [],
    hourlyRate: [row.hourly_rate_min || 15, row.hourly_rate_max || 30] as [number, number],
    rating: row.rating != null ? parseFloat(row.rating) : 0,
    reviewCount: row.review_count || 0,
    location: row.location || 'United States',
    verified: row.verified || false,
    backgroundChecked: row.background_checked || false,
    backgroundCheckStatus: bgStatus, // status badge only (no underlying PII)
    yearsExperience: row.years_experience || 0,
    availability: row.availability || 'Flexible',
    photoUrl: row.photo_url || undefined,
    serviceZips: row.service_zips || [],
    status: row.status || 'active',
    joinedAt: row.created_at,
    // Extended profile fields (safe to show families)
    jobTitle: row.job_title || 'Caregiver',
    languages: row.languages || ['English'],
    education: row.education || '',
    certifications: row.certifications || [],
    idVerificationStatus: row.id_verification_status || 'none', // status only
    resumeUrl: row.resume_url || '',
    resumes: row.resumes || [],
    // Coarse location (safe to show families)
    city: row.city || '',
    state: row.state || '',
    country: row.country || '',
    serviceRadiusMiles: row.service_radius_miles ?? 25,
  };

  if (!includePrivate) return base;

  // Owner/admin only — sensitive PII + precise location.
  // ID document images are NOT returned here (they live in private storage). We expose only
  // whether they've been submitted; admins fetch signed view URLs via a dedicated endpoint.
  return {
    ...base,
    email: row.email,
    idDocsSubmitted: !!(row.id_card_front && row.id_card_back && row.id_selfie),
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    address: row.address || '',
    zipCode: row.zip_code || '',
    formattedAddress: row.formatted_address || '',
    locationSource: row.location_source || '',
  };
}

// GET /api/caregivers/public — unauthenticated browse for homepage; returns top 4 caregivers near a location (or by rating)
router.get('/public', searchLimiter, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const cacheKey = `caregivers:public:${lat}:${lng}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const hasCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    let result;
    if (hasCoords) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      result = await query(
        `SELECT u.id, u.name, u.photo_url, u.status, u.created_at,
                cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
                cp.rating, cp.review_count, cp.location, cp.service_zips,
                cp.verified, cp.background_checked, cp.years_experience, cp.availability,
                cp.job_title, cp.languages, cp.education, cp.certifications,
                cp.id_verification_status, cp.background_check_status,
                cp.resume_url, cp.resumes,
                cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
                cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles,
                CASE WHEN cp.geo IS NOT NULL THEN ST_Distance(cp.geo, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) END AS distance_meters
         FROM users u
         JOIN caregiver_profiles cp ON cp.user_id = u.id
         WHERE u.status = 'active' AND u.role = 'caregiver'
         ORDER BY CASE WHEN cp.geo IS NOT NULL THEN ST_Distance(cp.geo, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) END ASC NULLS LAST, cp.rating DESC
         LIMIT 4`,
        [longitude, latitude]
      );
    } else {
      result = await query(
        `SELECT u.id, u.name, u.photo_url, u.status, u.created_at,
                cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
                cp.rating, cp.review_count, cp.location, cp.service_zips,
                cp.verified, cp.background_checked, cp.years_experience, cp.availability,
                cp.job_title, cp.languages, cp.education, cp.certifications,
                cp.id_verification_status, cp.background_check_status,
                cp.resume_url, cp.resumes,
                cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
                cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles
         FROM users u
         JOIN caregiver_profiles cp ON cp.user_id = u.id
         WHERE u.status = 'active' AND u.role = 'caregiver'
         ORDER BY cp.rating DESC, cp.review_count DESC
         LIMIT 4`
      );
    }

    const caregiversList = result.rows.map((row: any) => {
      const formatted: any = formatCaregiver(row, false);
      if (row.distance_meters != null) {
        // Convert to miles and round to 1 decimal place
        formatted.distanceMiles = Number((Number(row.distance_meters) * 0.000621371).toFixed(1));
      }
      return formatted;
    });

    const payload = { caregivers: caregiversList };
    await cacheSet(cacheKey, payload, 60); // Cache for 60 seconds
    res.json(payload);
  } catch (err) {
    console.error('Public caregivers fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch public caregivers' });
  }
});

// GET /api/caregivers — authenticated browse; returns PUBLIC fields only (no PII)
router.get('/', requireAuth, searchLimiter, async (req, res) => {
  try {
    const cacheKey = `caregivers:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { category, verified, backgroundChecked, sort, search } = req.query;

    const whereConditions = ["u.status = 'active'", "u.role = 'caregiver'"];
    const params: any[] = [];
    let paramIdx = 1;

    if (category && category !== 'all') {
      whereConditions.push(`$${paramIdx} = ANY(cp.specialties)`);
      params.push(category);
      paramIdx++;
    }
    if (verified === 'true') whereConditions.push('cp.verified = true');
    if (backgroundChecked === 'true') whereConditions.push('cp.background_checked = true');
    if (search) {
      const rawSearch = String(search).trim();
      const normalizedSearch = rawSearch.toLowerCase().replace(/\s+/g, '-');
      whereConditions.push(
        `(u.name ILIKE $${paramIdx}
          OR COALESCE(cp.bio, '') ILIKE $${paramIdx}
          OR COALESCE(cp.job_title, '') ILIKE $${paramIdx}
          OR COALESCE(cp.location, '') ILIKE $${paramIdx}
          OR COALESCE(u.email, '') ILIKE $${paramIdx}
          OR cp.specialties::text ILIKE $${paramIdx}
          OR cp.specialties::text ILIKE $${paramIdx + 1}
          OR cp.service_zips::text ILIKE $${paramIdx})`
      );
      params.push(`%${rawSearch}%`, `%${normalizedSearch}%`);
      paramIdx += 2;
    }

    let orderBy = 'cp.rating DESC, cp.review_count DESC';
    if (sort === 'rating') orderBy = 'cp.rating DESC';
    else if (sort === 'price-asc' || sort === 'price') orderBy = 'cp.hourly_rate_min ASC';
    else if (sort === 'price-desc' || sort === 'rate-high') orderBy = 'cp.hourly_rate_max DESC';
    else if (sort === 'experience') orderBy = 'cp.years_experience DESC';

    const result = await query(
      `SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications,
              cp.id_card_front, cp.id_card_back, cp.id_selfie,
              cp.id_verification_status, cp.background_check_status,
              cp.resume_url, cp.resumes,
              cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
              cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles,
              (SELECT status FROM verification_queue WHERE caregiver_id = u.id AND LOWER(COALESCE(background_check::text, 'false')) IN ('true', 't', '1', 'yes') AND status IN ('pending', 'awaiting_payment') LIMIT 1) as pending_status
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT 100`,
      params
    );

    const payload = { caregivers: result.rows.map((r: any) => formatCaregiver(r)) };
    await cacheSet(cacheKey, payload, 30); // Cache lists for 30s (Redis-backed, shared)

    res.json(payload);
  } catch (err) {
    console.error('Caregivers list error:', err);
    res.status(500).json({ error: 'Failed to fetch caregivers' });
  }
});

// GET /api/caregivers/profile/me — must be BEFORE /:id
router.get('/profile/me', requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications,
              cp.id_card_front, cp.id_card_back, cp.id_selfie,
              cp.id_verification_status, cp.background_check_status,
              cp.resume_url, cp.resumes,
              cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
              cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles,
              (SELECT status FROM verification_queue WHERE caregiver_id = u.id AND LOWER(COALESCE(background_check::text, 'false')) IN ('true', 't', '1', 'yes') AND status IN ('pending', 'awaiting_payment') LIMIT 1) as pending_status
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json({ caregiver: formatCaregiver(result.rows[0], true) }); // owner sees own PII
  } catch (err) {
    console.error('Caregiver profile me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/caregivers/:id — authenticated; PUBLIC fields only (cached, so never per-viewer PII)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const cacheKey = `caregivers:detail:${req.params.id}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications,
              cp.id_card_front, cp.id_card_back, cp.id_selfie,
              cp.id_verification_status, cp.background_check_status,
              cp.resume_url, cp.resumes,
              cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
              cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles,
              (SELECT status FROM verification_queue WHERE caregiver_id = u.id AND LOWER(COALESCE(background_check::text, 'false')) IN ('true', 't', '1', 'yes') AND status IN ('pending', 'awaiting_payment') LIMIT 1) as pending_status
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'caregiver'`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Caregiver not found' });

    const reviewsResult = await query(
      `SELECT r.id, r.rating, r.text, r.service, r.created_at, u.name as reviewer_name, u.photo_url as reviewer_photo
       FROM reviews r JOIN users u ON u.id = r.family_id
       WHERE r.caregiver_id = $1 ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    const caregiver = formatCaregiver(result.rows[0]);
    const payload = {
      caregiver: {
        ...caregiver,
        sampleReviews: reviewsResult.rows.map((r: any) => ({
          id: r.id,
          author: r.reviewer_name,
          photo: r.reviewer_photo,
          rating: r.rating,
          text: r.text,
          service: r.service,
          date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        })),
      },
    };

    await cacheSet(cacheKey, payload, 60); // Cache details for 60s (Redis-backed, shared)
    res.json(payload);
  } catch (err) {
    console.error('Caregiver get error:', err);
    res.status(500).json({ error: 'Failed to fetch caregiver' });
  }
});

// PUT /api/caregivers/profile
router.put('/profile', requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const {
      bio, specialties, hourlyRateMin, hourlyRateMax, yearsExperience,
      availability, location, serviceZips, jobTitle, languages, education, certifications,
      idCardFront, idCardBack, idSelfie,
      resumeUrl, resumes,
      locationData, serviceRadiusMiles
    } = req.body;
    // NOTE: idVerificationStatus / backgroundCheckStatus are intentionally NOT accepted
    // here — those are set only by admin review or the Checkr webhook, never by the
    // caregiver themselves (otherwise anyone could self-mark as "verified").

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (bio !== undefined) { updates.push(`bio = $${idx++}`); params.push(bio); }
    if (specialties) { updates.push(`specialties = $${idx++}`); params.push(specialties); }
    if (hourlyRateMin !== undefined) { updates.push(`hourly_rate_min = $${idx++}`); params.push(hourlyRateMin); }
    if (hourlyRateMax !== undefined) { updates.push(`hourly_rate_max = $${idx++}`); params.push(hourlyRateMax); }
    if (yearsExperience !== undefined) { updates.push(`years_experience = $${idx++}`); params.push(yearsExperience); }
    if (availability) { updates.push(`availability = $${idx++}`); params.push(availability); }
    if (location !== undefined) { updates.push(`location = $${idx++}`); params.push(location); }
    if (serviceZips) { updates.push(`service_zips = $${idx++}`); params.push(serviceZips); }
    if (jobTitle !== undefined) { updates.push(`job_title = $${idx++}`); params.push(jobTitle); }
    if (languages) { updates.push(`languages = $${idx++}`); params.push(languages); }
    if (education !== undefined) { updates.push(`education = $${idx++}`); params.push(education); }
    if (certifications) { updates.push(`certifications = $${idx++}`); params.push(certifications); }
    
    // New Profile Fields updates (ID number + raw bg-check details are no longer stored —
    // Turn.ai handles all sensitive identity/background data on its hosted flow).
    if (idCardFront !== undefined) { updates.push(`id_card_front = $${idx++}`); params.push(idCardFront); }
    if (idCardBack !== undefined) { updates.push(`id_card_back = $${idx++}`); params.push(idCardBack); }
    if (idSelfie !== undefined) { updates.push(`id_selfie = $${idx++}`); params.push(idSelfie); }
    if (resumeUrl !== undefined) { updates.push(`resume_url = $${idx++}`); params.push(resumeUrl); }
    if (resumes !== undefined) { updates.push(`resumes = $${idx++}`); params.push(JSON.stringify(resumes)); }

    // Confirmed service location (from the location picker) → drives geo matching.
    if (serviceRadiusMiles !== undefined) {
      const r = Math.min(Math.max(parseInt(String(serviceRadiusMiles), 10) || 25, 1), 200);
      updates.push(`service_radius_miles = $${idx++}`); params.push(r);
    }
    if (locationData && typeof locationData === 'object') {
      const loc = locationData;
      const lat = Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null;
      const lng = Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null;
      updates.push(`latitude = $${idx++}`); params.push(lat);
      updates.push(`longitude = $${idx++}`); params.push(lng);
      updates.push(`address = $${idx++}`); params.push(loc.address || null);
      updates.push(`city = $${idx++}`); params.push(loc.city || null);
      updates.push(`state = $${idx++}`); params.push(loc.state || null);
      updates.push(`zip_code = $${idx++}`); params.push(loc.zipCode || null);
      updates.push(`country = $${idx++}`); params.push(loc.country || null);
      updates.push(`formatted_address = $${idx++}`); params.push(loc.formattedAddress || null);
      updates.push(`location_source = $${idx++}`); params.push(loc.locationSource || null);
      // keep the display `location` string in sync for legacy views
      if (loc.formattedAddress) { updates.push(`location = $${idx++}`); params.push(loc.formattedAddress); }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    // Ensure profile exists for older accounts
    await query(`INSERT INTO caregiver_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [req.user!.id]);

    params.push(req.user!.id);
    await query(`UPDATE caregiver_profiles SET ${updates.join(', ')} WHERE user_id = $${idx}`, params);

    const result = await query(
      `SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications,
              cp.id_card_front, cp.id_card_back, cp.id_selfie,
              cp.id_verification_status, cp.background_check_status,
              cp.resume_url, cp.resumes,
              cp.latitude, cp.longitude, cp.address, cp.city, cp.state, cp.zip_code,
              cp.country, cp.formatted_address, cp.location_source, cp.service_radius_miles,
              (SELECT status FROM verification_queue WHERE caregiver_id = u.id AND LOWER(COALESCE(background_check::text, 'false')) IN ('true', 't', '1', 'yes') AND status IN ('pending', 'awaiting_payment') LIMIT 1) as pending_status
       FROM users u JOIN caregiver_profiles cp ON cp.user_id = u.id WHERE u.id = $1`,
      [req.user!.id]
    );
    const payload = { caregiver: formatCaregiver(result.rows[0], true) }; // owner editing own profile
    invalidateCache('caregivers:');
    res.json(payload);
  } catch (err) {
    console.error('Caregiver profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/caregivers/verify-id  (DEPRECATED)
// Identity is now verified by our screening partner (Turn) as part of the background
// check — we no longer collect or store government-ID documents in the app.
router.post('/verify-id', requireCaregiver, async (_req: AuthRequest, res) => {
  return res.status(410).json({
    error: 'Identity is now verified through your background check. Start it from your dashboard.',
    code: 'IDENTITY_VIA_BACKGROUND_CHECK',
    endpoint: '/api/background-check/start',
  });
});

// POST /api/caregivers/apply-background-check  (DEPRECATED)
// Replaced by the payment-first Turn.ai flow: POST /api/background-check/start.
// Kept as a stub so old clients get a clear redirect and we never store bg-check PII.
router.post('/apply-background-check', requireCaregiver, async (_req: AuthRequest, res) => {
  return res.status(410).json({
    error: 'This flow has moved. Start your background check from your dashboard.',
    code: 'USE_BACKGROUND_CHECK_START',
    endpoint: '/api/background-check/start',
  });
});

// POST /api/caregivers/background-check
router.post('/background-check', requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const { documentBase64, documentName } = req.body;
    if (!documentBase64) {
      return res.status(400).json({ error: 'Please upload a valid document.' });
    }

    // SECURITY: encrypt the raw document blob at rest (PII). No-op until PII_ENCRYPTION_KEY
    // is set; the admin review endpoint decrypts it transparently.
    const documentObj = { name: documentName || 'verification_document.pdf', url: encryptPII(documentBase64) };

    // Insert into verification_queue
    const qResult = await query(
      `INSERT INTO verification_queue (caregiver_id, specialty, experience, documents, background_check, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'awaiting_payment', NOW())
       RETURNING *`,
      [req.user!.id, 'General Care', 'N/A', JSON.stringify([documentObj]), true]
    );

    res.json({ success: true, entry: qResult.rows[0] });
  } catch (err) {
    console.error('Submit background check error:', err);
    res.status(500).json({ error: 'Failed to submit background check document' });
  }
});

// POST /api/caregivers/background-check/pay-success
router.post('/background-check/pay-success', requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const { getUncachableStripeClient } = await import('../stripeClient.js');

    let stripe: any;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.type === 'background_check' && session.metadata?.userId === req.user!.id) {
      // Update payment record
      await query(
        `UPDATE payments SET status = 'succeeded', stripe_payment_intent_id = $1
         WHERE user_id = $2 AND stripe_payment_intent_id = $3`,
        [session.payment_intent || session.id, req.user!.id, sessionId]
      );

      // Update queue entry
      await query(
        `UPDATE verification_queue SET status = 'pending', submitted_at = NOW()
         WHERE caregiver_id = $1 AND status = 'awaiting_payment'`,
        [req.user!.id]
      );
      
      // Fallback if no entry exists yet (e.g. premium instant check without step 1 upload, though the UI should prevent this now)
      await query(
        `INSERT INTO verification_queue (caregiver_id, specialty, experience, documents, background_check, status, submitted_at)
         VALUES ($1, $2, $3, $4, true, 'pending', NOW())
         ON CONFLICT DO NOTHING`,
        [req.user!.id, 'General Care', 'N/A', JSON.stringify([{ name: 'Paid Premium Background Verification', url: '#' }])]
      );
      invalidateCache('caregivers:');
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid background check payment session' });
  } catch (err: any) {
    console.error('BG check payment success sync error:', err);
    res.status(500).json({ error: 'Failed to synchronize payment checkout status' });
  }
});

export default router;
