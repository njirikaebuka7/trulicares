import { Router } from 'express';
import { query, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';

const router = Router();

// ── POST /api/staffing/shifts — Facility posts a shift ────────
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    // Get facility profile + verify approved
    const facilityRes = await query(
      'SELECT id, verification_status FROM facility_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (facilityRes.rows.length === 0) {
      return res.status(400).json({ error: 'Facility profile not found. Please complete onboarding.' });
    }
    const facility = facilityRes.rows[0];
    // if (facility.verification_status !== 'approved') {
    //   return res.status(403).json({ error: 'Your facility must be verified before posting shifts.' });
    // }

    const {
      role, specialty, description, payRate, durationHours,
      startTime, location, address, city, state, zip, slotsTotal,
    } = req.body;

    if (!role || !payRate || !durationHours || !startTime || !location) {
      return res.status(400).json({ error: 'Role, pay rate, duration, start time, and location are required' });
    }

    // Get current platform fee rate
    const settingsRes = await query(
      "SELECT value FROM platform_settings WHERE key = 'staffing_platform_fee_rate'",
      []
    );
    const feeRate = parseFloat(settingsRes.rows[0]?.value || '0.20');

    const result = await query(
      `INSERT INTO shifts
         (facility_id, role, specialty, description, pay_rate, duration_hours,
          start_time, location, address, city, state, zip, platform_fee_rate, slots_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *, (pay_rate * duration_hours) AS total_pay`,
      [
        facility.id, role, specialty || null, description || null,
        parseFloat(payRate), parseFloat(durationHours),
        startTime, location,
        address || null, city || null, state || null, zip || null,
        feeRate, slotsTotal || 1,
      ]
    );

    await supabase.channel(`facility:${req.user!.id}`).send({
      type: 'broadcast',
      event: 'shift_status_change',
      payload: { shiftId: result.rows[0].id, status: 'open' },
    }).catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Post shift error:', err);
    res.status(500).json({ error: 'Failed to post shift' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, city, state, minPay, maxPay, startAfter, limit = '20', offset = '0' } = req.query as any;
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    const conditions: string[] = ["s.status = 'open'", 's.start_time > NOW()'];
    const filterParams: any[] = [];
    let idx = 1;

    if (role) { conditions.push(`s.role = $${idx++}`); filterParams.push(role); }
    if (city) { conditions.push(`s.city ILIKE $${idx++}`); filterParams.push(`%${city}%`); }
    if (state) { conditions.push(`s.state = $${idx++}`); filterParams.push(state); }
    if (minPay) { conditions.push(`s.pay_rate >= $${idx++}`); filterParams.push(parseFloat(minPay)); }
    if (maxPay) { conditions.push(`s.pay_rate <= $${idx++}`); filterParams.push(parseFloat(maxPay)); }
    if (startAfter) { conditions.push(`s.start_time >= $${idx++}`); filterParams.push(startAfter); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // If the requester is a professional, we can identify matches across ALL their licenses
    let professionalProfile: any = null;
    let allLicenses: string[] = [];
    let profileSpecialties: string[] = [];
    if (req.user!.role === 'professional') {
      const proRes = await query(
        `SELECT pp.license_type, pp.specialties,
                (SELECT json_agg(pl.license_type) FROM professional_licenses pl WHERE pl.professional_id = pp.id) as extra_licenses
         FROM professional_profiles pp WHERE pp.user_id = $1`,
        [req.user!.id]
      );
      professionalProfile = proRes.rows[0];
      if (professionalProfile) {
        allLicenses = [professionalProfile.license_type, ...(professionalProfile.extra_licenses || [])].filter(Boolean);
        profileSpecialties = professionalProfile.specialties || [];
      }
    }

    const licenseParamIndex = idx++;
    const limitParamIndex = idx++;
    const offsetParamIndex = idx++;

    const result = await query(
      `SELECT s.id, s.ref_id, s.role, s.specialty, s.description,
              s.pay_rate, s.duration_hours, s.total_pay, s.start_time, s.end_time,
              s.location, s.city, s.state, s.zip, s.status,
              s.slots_total, s.slots_filled,
              fp.facility_name, fp.facility_type,
              CASE
                WHEN cardinality($${licenseParamIndex}::text[]) = 0 THEN false
                ELSE s.role = ANY($${licenseParamIndex}::text[])
              END AS is_match,
              (SELECT COUNT(*) FROM shift_applications sa WHERE sa.shift_id = s.id AND sa.status = 'pending') AS applicant_count
       FROM shifts s
       JOIN facility_profiles fp ON fp.id = s.facility_id
       ${whereClause}
       ORDER BY is_match DESC, s.start_time ASC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      [...filterParams, allLicenses, parsedLimit, parsedOffset]
    );

    const shifts = result.rows.map((s: any) => ({
      ...s,
      is_match: professionalProfile 
        ? (allLicenses.includes(s.role) &&
           (!s.specialty || profileSpecialties.includes(s.specialty)))
        : false
    }));

    const countRes = await query(
      `SELECT COUNT(*) FROM shifts s ${whereClause}`,
      filterParams
    );

    res.json({
      shifts,
      total: parseInt(countRes.rows[0].count),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    console.error('Browse shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// ── GET /api/staffing/shifts/my — Facility's own shifts ───────
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    const facilityRes = await query(
      'SELECT id FROM facility_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (facilityRes.rows.length === 0) {
      return res.json({ shifts: [] });
    }

    const result = await query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM shift_applications sa WHERE sa.shift_id = s.id AND sa.status = 'pending') AS pending_applicants,
              (SELECT COUNT(*) FROM shift_applications sa WHERE sa.shift_id = s.id) AS total_applicants
       FROM shifts s
       WHERE s.facility_id = $1
       ORDER BY s.start_time DESC`,
      [facilityRes.rows[0].id]
    );

    res.json({ shifts: result.rows });
  } catch (err) {
    console.error('My shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// ── GET /api/staffing/shifts/overview ────────────────────────
router.get('/overview', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role === 'professional') {
      const proRes = await query('SELECT id FROM professional_profiles WHERE user_id = $1', [req.user!.id]);
      if (proRes.rows.length === 0) return res.json({ stats: { upcoming: 0, applications: 0, completed: 0 } });
      const proId = proRes.rows[0].id;

      const upcoming = await query(`SELECT COUNT(*) FROM shift_bookings WHERE professional_id = $1 AND status IN ('paid', 'checked_in', 'in_progress')`, [proId]);
      const apps = await query(`SELECT COUNT(*) FROM shift_applications WHERE professional_id = $1 AND status = 'pending'`, [proId]);
      const completed = await query(`SELECT COUNT(*) FROM shift_bookings WHERE professional_id = $1 AND status = 'completed'`, [proId]);

      return res.json({
        stats: {
          upcoming: parseInt(upcoming.rows[0].count),
          applications: parseInt(apps.rows[0].count),
          completed: parseInt(completed.rows[0].count)
        }
      });
    } else if (req.user!.role === 'facility') {
      const facRes = await query('SELECT id FROM facility_profiles WHERE user_id = $1', [req.user!.id]);
      if (facRes.rows.length === 0) {
        return res.json({ stats: { open: 0, filled: 0, pending: 0, completed: 0, totalPros: 0, active: 0 } });
      }
      const facId = facRes.rows[0].id;

      const open = await query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'open'`, [facId]);
      const filled = await query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'filled'`, [facId]);
      const pending = await query(`SELECT COUNT(*) FROM shift_applications sa JOIN shifts s ON s.id = sa.shift_id WHERE s.facility_id = $1 AND sa.status = 'pending'`, [facId]);
      const completed = await query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'completed'`, [facId]);
      const totalPros = await query(
        `SELECT COUNT(DISTINCT sa.professional_id) AS count
         FROM shift_applications sa
         JOIN shifts s ON s.id = sa.shift_id
         WHERE s.facility_id = $1`,
        [facId]
      );

      return res.json({
        stats: {
          open: parseInt(open.rows[0].count),
          filled: parseInt(filled.rows[0].count),
          pending: parseInt(pending.rows[0].count),
          completed: parseInt(completed.rows[0].count),
          totalPros: parseInt(totalPros.rows[0].count),
          active: parseInt(filled.rows[0].count),
        }
      });
    }
    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

// ── GET /api/staffing/shifts/active — Professional's active/upcoming shift ──
router.get('/active', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role === 'professional') {
      const proRes = await query(
        'SELECT id FROM professional_profiles WHERE user_id = $1',
        [req.user!.id]
      );
      if (proRes.rows.length === 0) return res.json({ shift: null });

      const result = await query(
        `SELECT s.*, b.id as booking_id, b.status as booking_status,
                fp.facility_name, fp.address, fp.city, fp.state
         FROM shift_bookings b
         JOIN shifts s ON s.id = b.shift_id
         JOIN facility_profiles fp ON fp.id = s.facility_id
         WHERE b.professional_id = $1
         AND b.status NOT IN ('cancelled', 'completed', 'disputed')
         ORDER BY s.start_time ASC
         LIMIT 1`,
        [proRes.rows[0].id]
      );
      return res.json({ shift: result.rows[0] || null });
    } else if (req.user!.role === 'facility') {
      const facRes = await query(
        'SELECT id FROM facility_profiles WHERE user_id = $1',
        [req.user!.id]
      );
      if (facRes.rows.length === 0) return res.json({ shifts: [] });

      // Facility might have multiple active shifts (different pros)
      const result = await query(
        `SELECT s.*, b.id as booking_id, b.status as booking_status,
                u.name as professional_name, u.photo_url as professional_photo
         FROM shift_bookings b
         JOIN shifts s ON s.id = b.shift_id
         JOIN professional_profiles pp ON pp.id = b.professional_id
         JOIN users u ON u.id = pp.user_id
         WHERE b.facility_id = $1
         AND b.status IN ('paid', 'checked_in', 'in_progress', 'checked_out')
         ORDER BY s.start_time ASC`,
        [facRes.rows[0].id]
      );
      return res.json({ shifts: result.rows });
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Active shift error:', err);
    res.status(500).json({ error: 'Failed to fetch active shift' });
  }
});

// ── GET /api/staffing/shifts/:id — Shift detail ───────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT s.*, fp.facility_name, fp.facility_type, fp.city AS facility_city,
              fp.phone AS facility_phone, fp.verification_status AS facility_verified
       FROM shifts s
       JOIN facility_profiles fp ON fp.id = s.facility_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get shift error:', err);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// ── DELETE /api/staffing/shifts/:id — Cancel a shift ──────────
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    const facilityRes = await query(
      'SELECT id FROM facility_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (facilityRes.rows.length === 0) {
      return res.status(404).json({ error: 'Facility profile not found' });
    }

    const result = await query(
      `UPDATE shifts SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND facility_id = $2 AND status = 'open'
       RETURNING id`,
      [req.params.id, facilityRes.rows[0].id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found or cannot be cancelled' });
    }
    await supabase.channel(`facility:${req.user!.id}`).send({
      type: 'broadcast',
      event: 'shift_status_change',
      payload: { shiftId: req.params.id, status: 'cancelled' },
    }).catch(() => {});
    res.json({ message: 'Shift cancelled' });
  } catch (err) {
    console.error('Cancel shift error:', err);
    res.status(500).json({ error: 'Failed to cancel shift' });
  }
});

export default router;
