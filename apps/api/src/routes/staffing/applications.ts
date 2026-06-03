import { Router } from 'express';
import { query, getClient, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { getUncachableStripeClient } from '../../stripeClient.js';
import { enqueueEmail } from '../../queues/queues.js';

const router = Router();

// ── POST /api/staffing/applications — Apply to a shift ────────
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    // Get professional profile + verify approved
    const proRes = await query(
      `SELECT id, verification_status, license_type, specialties,
       (SELECT json_agg(pl.license_type) FROM professional_licenses pl WHERE pl.professional_id = professional_profiles.id) as extra_licenses
       FROM professional_profiles
       WHERE user_id = $1`,
      [req.user!.id]
    );
    if (proRes.rows.length === 0) {
      return res.status(400).json({ error: 'Professional profile not found. Please complete onboarding.' });
    }
    const pro = proRes.rows[0];

    // Compliance: only verified professionals can apply to / book shifts.
    if (pro.verification_status !== 'approved') {
      return res.status(403).json({
        error: 'Your profile must be verified before you can apply to shifts. Our team is reviewing your credentials.',
        code: 'PRO_NOT_VERIFIED',
      });
    }

    const allLicenses = [pro.license_type, ...(pro.extra_licenses || [])].filter(Boolean);

    const { shiftId, coverNote } = req.body;
    if (!shiftId) {
      return res.status(400).json({ error: 'Shift ID is required' });
    }

    // Verify shift is open + matching credentials
    const shiftRes = await query(
      "SELECT id, status, role, specialty FROM shifts WHERE id = $1",
      [shiftId]
    );
    if (shiftRes.rows.length === 0 || shiftRes.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Shift is not available for applications' });
    }
    const shift = shiftRes.rows[0];

    // ROLE MATCHING
    if (!allLicenses.includes(shift.role)) {
      return res.status(403).json({ 
        error: `Credential mismatch: This shift requires an ${shift.role}, but you are registered as ${allLicenses.join(', ') || 'none'}.` 
      });
    }

    // SPECIALTY MATCHING (if required by shift)
    if (shift.specialty && (!pro.specialties || !pro.specialties.includes(shift.specialty))) {
      return res.status(403).json({ 
        error: `Certification required: This shift requires the ${shift.specialty} specialty, which is not listed on your profile.` 
      });
    }

    const result = await query(
      `INSERT INTO shift_applications (shift_id, professional_id, cover_note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [shiftId, pro.id, coverNote || null]
    );

    // Broadcast + email the facility about the new applicant
    const shiftInfo = await query(
      `SELECT s.role, s.ref_id, fp.user_id, u.email AS facility_email, u.name AS facility_contact
       FROM shifts s
       JOIN facility_profiles fp ON fp.id = s.facility_id
       JOIN users u ON u.id = fp.user_id
       WHERE s.id = $1`,
      [shiftId]
    );
    if (shiftInfo.rows.length > 0) {
      const fac = shiftInfo.rows[0];
      await supabase.channel(`facility:${fac.user_id}`).send({
        type: 'broadcast',
        event: 'new_application',
        payload: { shiftId, professionalName: req.user!.name || 'A professional' },
      }).catch(() => {});
      await supabase.channel(`facility:${fac.user_id}`).send({
        type: 'broadcast',
        event: 'shift_status_change',
        payload: { shiftId, reason: 'application_submitted' },
      }).catch(() => {});

      await enqueueEmail('care-request', fac.facility_email, {
        name: fac.facility_contact,
        heading: 'New applicant for your shift',
        message: `${req.user!.name} applied for your ${fac.role} shift (${fac.ref_id}). Review their profile and accept if they're a fit.`,
        cta: 'Review Applicants',
        url: `${process.env.APP_URL || ''}/facility-dashboard/shifts`,
      }).catch(() => {});
    }

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already applied to this shift' });
    }
    console.error('Apply to shift error:', err);
    res.status(500).json({ error: 'Failed to apply to shift' });
  }
});

// ── GET /api/staffing/applications/my — Professional's own applications ──
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const proRes = await query(
      'SELECT id FROM professional_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (proRes.rows.length === 0) return res.json({ applications: [] });

    const result = await query(
      `SELECT sa.*, s.ref_id AS shift_ref, s.role, s.pay_rate, s.duration_hours,
              s.total_pay, s.start_time, s.end_time, s.location, s.city, s.state,
              s.status AS shift_status, fp.facility_name,
              sb.id AS booking_id, sb.status AS booking_status, sb.ref_id AS booking_ref
       FROM shift_applications sa
       JOIN shifts s ON s.id = sa.shift_id
       JOIN facility_profiles fp ON fp.id = s.facility_id
       LEFT JOIN shift_bookings sb ON sb.application_id = sa.id
       WHERE sa.professional_id = $1
       ORDER BY sa.applied_at DESC`,
      [proRes.rows[0].id]
    );

    res.json({ applications: result.rows });
  } catch (err) {
    console.error('My applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ── GET /api/staffing/applications/shift/:shiftId — All applicants ──
router.get('/shift/:shiftId', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    // Verify facility owns this shift
    const facilityRes = await query(
      'SELECT id FROM facility_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (facilityRes.rows.length === 0) {
      return res.status(403).json({ error: 'Facility profile not found' });
    }

    const shiftOwner = await query(
      'SELECT id FROM shifts WHERE id = $1 AND facility_id = $2',
      [req.params.shiftId, facilityRes.rows[0].id]
    );
    if (shiftOwner.rows.length === 0) {
      return res.status(403).json({ error: 'Shift not found or access denied' });
    }

    const result = await query(
      `SELECT sa.id, sa.status, sa.cover_note, sa.applied_at,
              pp.id AS professional_id, pp.license_type, pp.specialties,
              pp.years_experience, pp.verification_status, pp.bio, pp.location,
              pp.work_experience, pp.certifications, pp.background_check_status,
              (SELECT json_agg(pl.license_type) FROM professional_licenses pl WHERE pl.professional_id = pp.id) as extra_licenses,
              u.name, u.email, u.photo_url, u.phone
       FROM shift_applications sa
       JOIN professional_profiles pp ON pp.id = sa.professional_id
       JOIN users u ON u.id = pp.user_id
       WHERE sa.shift_id = $1
       ORDER BY sa.applied_at ASC`,
      [req.params.shiftId]
    );

    res.json({ applicants: result.rows });
  } catch (err) {
    console.error('Get applicants error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// ── PUT /api/staffing/applications/:id/accept — Accept applicant ──
router.put('/:id/accept', requireAuth, async (req: AuthRequest, res) => {
  const client = await getClient();
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    await client.query('BEGIN');

    // Get application with shift details
    const appRes = await client.query(
      `SELECT sa.*, s.pay_rate, s.duration_hours, s.total_pay, s.platform_fee_rate,
              s.facility_id, s.status AS shift_status,
              pp.user_id AS pro_user_id
       FROM shift_applications sa
       JOIN shifts s ON s.id = sa.shift_id
       JOIN professional_profiles pp ON pp.id = sa.professional_id
       WHERE sa.id = $1`,
      [req.params.id]
    );
    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appRes.rows[0];

    if (app.shift_status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Shift is no longer open' });
    }
    if (app.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Application is not in pending state' });
    }

    // Verify facility owns this shift
    const facilityRes = await client.query(
      'SELECT id FROM facility_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (facilityRes.rows.length === 0 || facilityRes.rows[0].id !== app.facility_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate financials
    const wageAmount = parseFloat(app.total_pay);
    const platformFeeAmount = parseFloat((wageAmount * parseFloat(app.platform_fee_rate)).toFixed(2));
    const totalCharged = parseFloat((wageAmount + platformFeeAmount).toFixed(2));

    // Update application status
    await client.query(
      `UPDATE shift_applications SET status = 'accepted', reviewed_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Reject all other pending applications for this shift and notify them
    const rejectedApps = await client.query(
      `UPDATE shift_applications sa
       SET status = 'rejected', reviewed_at = NOW()
       FROM professional_profiles pp
       WHERE sa.shift_id = $1 AND sa.id != $2 AND sa.status = 'pending' AND pp.id = sa.professional_id
       RETURNING sa.id, pp.user_id`,
      [app.shift_id, req.params.id]
    );

    for (const rej of rejectedApps.rows) {
      const rejNotifRes = await client.query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, 'shift_application_rejected', 'Application Not Selected', 'The facility has chosen another candidate for the shift you applied for.')
         RETURNING *`,
        [rej.user_id]
      );
      await supabase.channel(`notifications:${rej.user_id}`).send({
        type: 'broadcast',
        event: 'new_notification',
        payload: rejNotifRes.rows[0],
      }).catch(() => {});
      await supabase.channel(`professional:${rej.user_id}`).send({
        type: 'broadcast',
        event: 'application_rejected',
        payload: { shiftId: app.shift_id },
      }).catch(() => {});
    }

    // Create booking
    const bookingRes = await client.query(
      `INSERT INTO shift_bookings
         (ref_id, application_id, shift_id, professional_id, facility_id,
          wage_amount, platform_fee_amount, total_charged, status)
       VALUES ('', $1, $2, $3, $4, $5, $6, $7, 'awaiting_payment')
       RETURNING *`,
      [
        req.params.id, app.shift_id, app.professional_id, facilityRes.rows[0].id,
        wageAmount, platformFeeAmount, totalCharged,
      ]
    );
    const booking = bookingRes.rows[0];

    // Open an in-app chat thread between this facility and professional.
    await client.query(
      `INSERT INTO staffing_conversations (facility_id, professional_id, booking_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (facility_id, professional_id)
         DO UPDATE SET booking_id = COALESCE(staffing_conversations.booking_id, EXCLUDED.booking_id), updated_at = NOW()`,
      [req.user!.id, app.pro_user_id, booking.id]
    ).catch(() => {});

    // Mark shift as filled
    await client.query(
      `UPDATE shifts SET status = 'filled', slots_filled = slots_filled + 1, updated_at = NOW()
       WHERE id = $1`,
      [app.shift_id]
    );

    let stripe: any;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      await client.query('ROLLBACK');
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    // Create Stripe checkout session for the facility to pay
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(totalCharged * 100),
            product_data: {
              name: `Shift Booking ${booking.ref_id}`,
              description: `Wage: $${wageAmount} + Platform Fee: $${platformFeeAmount}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        type: 'staffing_shift',
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/facility-dashboard?payment=success&booking=${booking.id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/facility-dashboard?payment=cancelled`,
    });

    // Update booking with session ID
    await client.query(
      `UPDATE shift_bookings SET stripe_session_id = $1 WHERE id = $2`,
      [session.id, booking.id]
    );

    await client.query('COMMIT');

    // Broadcast and Notify professional
    const notifRes = await client.query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'shift_application_accepted', 'Application Accepted!', 'Your application for shift ' || $2 || ' has been accepted by the facility. You are hired!')
       RETURNING *`,
      [app.pro_user_id, app.shift_id]
    );
    const newNotif = notifRes.rows[0];

    await supabase.channel(`notifications:${app.pro_user_id}`).send({
      type: 'broadcast',
      event: 'new_notification',
      payload: newNotif,
    }).catch(() => {});
    
    await supabase.channel(`professional:${app.pro_user_id}`).send({
      type: 'broadcast',
      event: 'application_accepted',
      payload: { bookingId: booking.id, shiftId: app.shift_id },
    }).catch(() => {});
    await supabase.channel(`professional:${app.pro_user_id}`).send({
      type: 'broadcast',
      event: 'booking_status_change',
      payload: { bookingId: booking.id, shiftId: app.shift_id, status: 'awaiting_payment' },
    }).catch(() => {});
    await supabase.channel(`facility:${req.user!.id}`).send({
      type: 'broadcast',
      event: 'shift_status_change',
      payload: { bookingId: booking.id, shiftId: app.shift_id, status: 'awaiting_payment' },
    }).catch(() => {});

    // Email the hired professional
    const proUser = await query('SELECT email, name FROM users WHERE id = $1', [app.pro_user_id]);
    if (proUser.rows[0]) {
      await enqueueEmail('account-approval', proUser.rows[0].email, {
        name: proUser.rows[0].name,
        message: 'your application was accepted — you’re hired for the shift!',
      }).catch(() => {});
    }

    res.json({
      booking: { ...booking, stripe_session_id: session.id },
      checkoutUrl: session.url,
      financials: { wageAmount, platformFeeAmount, totalCharged },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Accept application error:', err);
    res.status(500).json({ error: 'Failed to accept application' });
  } finally {
    client.release();
  }
});

// ── PUT /api/staffing/applications/:id/reject ─────────────────
router.put('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'facility') {
      return res.status(403).json({ error: 'Facility access only' });
    }

    const result = await query(
      `UPDATE shift_applications sa
       SET status = 'rejected', reviewed_at = NOW()
       FROM professional_profiles pp
       WHERE sa.id = $1 AND sa.status = 'pending' AND pp.id = sa.professional_id
       RETURNING sa.id, sa.shift_id, pp.user_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or already processed' });
    }

    const appRow = result.rows[0];

    // Notify professional (in-app + email)
    const notifRes = await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'shift_application_rejected', 'Application Not Selected', 'The facility has declined your application for this shift.')
       RETURNING *`,
      [appRow.user_id]
    );
    const rejUser = await query('SELECT email, name FROM users WHERE id = $1', [appRow.user_id]);
    if (rejUser.rows[0]) {
      await enqueueEmail('generic-notification', rejUser.rows[0].email, {
        name: rejUser.rows[0].name,
        subject: 'Update on your shift application',
        heading: 'Application not selected',
        message: 'The facility chose another candidate for this shift. Keep browsing — new shifts are posted regularly.',
        cta: 'Browse Shifts',
        url: `${process.env.APP_URL || ''}/professional-dashboard/browse`,
      }).catch(() => {});
    }
    await supabase.channel(`notifications:${appRow.user_id}`).send({
      type: 'broadcast',
      event: 'new_notification',
      payload: notifRes.rows[0],
    }).catch(() => {});
    await supabase.channel(`professional:${appRow.user_id}`).send({
      type: 'broadcast',
      event: 'application_rejected',
      payload: { shiftId: appRow.shift_id },
    }).catch(() => {});

    const shiftOwner = await query(
      `SELECT fp.user_id
       FROM shifts s
       JOIN facility_profiles fp ON fp.id = s.facility_id
       WHERE s.id = $1`,
      [appRow.shift_id]
    );
    if (shiftOwner.rows[0]) {
      await supabase.channel(`facility:${shiftOwner.rows[0].user_id}`).send({
        type: 'broadcast',
        event: 'shift_status_change',
        payload: { shiftId: result.rows[0].shift_id, reason: 'application_rejected' },
      }).catch(() => {});
    }
    res.json({ message: 'Application rejected' });
  } catch (err) {
    console.error('Reject application error:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// ── PUT /api/staffing/applications/:id/withdraw — Pro withdraws ──
router.put('/:id/withdraw', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'professional') {
      return res.status(403).json({ error: 'Professional access only' });
    }

    const proRes = await query(
      'SELECT id FROM professional_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (proRes.rows.length === 0) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    const result = await query(
      `UPDATE shift_applications SET status = 'withdrawn'
       WHERE id = $1 AND professional_id = $2 AND status = 'pending'
       RETURNING id, shift_id`,
      [req.params.id, proRes.rows[0].id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or cannot be withdrawn' });
    }
    const shiftOwner = await query(
      `SELECT fp.user_id
       FROM shifts s
       JOIN facility_profiles fp ON fp.id = s.facility_id
       WHERE s.id = $1`,
      [result.rows[0].shift_id]
    );
    if (shiftOwner.rows[0]) {
      await supabase.channel(`facility:${shiftOwner.rows[0].user_id}`).send({
        type: 'broadcast',
        event: 'shift_status_change',
        payload: { shiftId: result.rows[0].shift_id, reason: 'application_withdrawn' },
      }).catch(() => {});
    }
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    console.error('Withdraw application error:', err);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

export default router;
