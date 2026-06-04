import { Router } from 'express';
import { query, supabase } from '../db.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sendVerificationStatusEmail } from '../services/email.js';
import { decryptArray } from '../services/pii.js';
import { auditFromReq } from '../services/audit.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rate-limit all admin mutations (40/min/admin). Reads are unaffected.
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return writeLimiter(req, res, next);
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [usersResult, caregiversResult, reportsResult, pendingResult, matchesResult, revenueResult, growthResult, staffingResult] = await Promise.all([
      query(`SELECT
               COUNT(*) as total,
               COUNT(CASE WHEN role = 'family' THEN 1 END) as families,
               COUNT(CASE WHEN role = 'caregiver' THEN 1 END) as caregivers,
               COUNT(CASE WHEN role = 'professional' THEN 1 END) as professionals,
               COUNT(CASE WHEN role = 'facility' THEN 1 END) as facilities,
               COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
             FROM users WHERE role != 'admin' AND deleted_at IS NULL`),
      query(`SELECT
               COUNT(*) as total,
               COUNT(CASE WHEN verified = true THEN 1 END) as verified,
               COUNT(CASE WHEN background_checked = true THEN 1 END) as background_checked
             FROM caregiver_profiles`),
      query(`SELECT
               COUNT(*) as open_total,
               COUNT(CASE WHEN status = 'open' THEN 1 END) as open
             FROM reports`),
      query(`SELECT COUNT(*) as pending FROM verification_queue WHERE status = 'pending'`),
      query(`SELECT COUNT(*) as active FROM matches WHERE status = 'accepted'`),
      query(`SELECT COALESCE(SUM(amount_cents),0) as total FROM payments WHERE status='succeeded' AND created_at >= date_trunc('month', NOW())`),
      query(`
        SELECT
          TO_CHAR(date_trunc('month', generate_series), 'Mon') as month,
          date_trunc('month', generate_series) as month_date,
          (SELECT COUNT(*) FROM users WHERE role='family' AND created_at <= date_trunc('month', generate_series) + INTERVAL '1 month') as families,
          (SELECT COUNT(*) FROM users WHERE role='caregiver' AND created_at <= date_trunc('month', generate_series) + INTERVAL '1 month') as caregivers
        FROM generate_series(NOW() - INTERVAL '5 months', NOW(), '1 month') as generate_series
        ORDER BY month_date ASC
      `),
      query(`SELECT
               (SELECT COUNT(*) FROM shifts WHERE status = 'open') as active_shifts,
               (SELECT COUNT(*) FROM shift_disputes WHERE status = 'open') as open_disputes,
               (SELECT COUNT(*) FROM professional_profiles WHERE verification_status = 'pending') as pending_pros
             FROM (SELECT 1) as dummy`),
    ]);

    const users = usersResult.rows[0];
    const caregivers = caregiversResult.rows[0];

    const monthlyGrowth = growthResult.rows.map((r: any) => ({
      month: r.month,
      families: parseInt(r.families) || 0,
      caregivers: parseInt(r.caregivers) || 0,
    }));

    res.json({
      stats: {
        totalUsers: parseInt(users.total),
        totalFamilies: parseInt(users.families),
        totalCaregivers: parseInt(users.caregivers),
        totalProfessionals: parseInt(users.professionals),
        totalFacilities: parseInt(users.facilities),
        newSignupsThisMonth: parseInt(users.new_this_month),
        verifiedCaregivers: parseInt(caregivers.verified),
        backgroundChecked: parseInt(caregivers.background_checked),
        openReports: parseInt(reportsResult.rows[0].open),
        pendingVerifications: parseInt(pendingResult.rows[0].pending) + parseInt(staffingResult.rows[0].pending_pros),
        activeMatches: parseInt(matchesResult.rows[0].active),
        activeShifts: parseInt(staffingResult.rows[0].active_shifts),
        openDisputes: parseInt(staffingResult.rows[0].open_disputes),
        monthlyRevenue: Math.round(parseInt(revenueResult.rows[0].total) / 100),
        monthlyGrowth,
        platformHealth: 'Operational',
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { search, role, page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    const conditions: string[] = ["u.role != 'admin'", 'u.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role && role !== 'all') {
      conditions.push(`u.role = $${idx}`);
      params.push(role);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*) FROM users u ${where}`, params);
    params.push(limit, offset);

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.photo_url, u.created_at, u.address,
              cp.verified, cp.background_checked, cp.rating, cp.review_count, cp.location, cp.specialties,
              (SELECT COUNT(*) FROM matches WHERE caregiver_id = u.id OR family_id = u.id) as match_count
       FROM users u
       LEFT JOIN caregiver_profiles cp ON cp.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        photoUrl: u.photo_url,
        location: u.location || u.address || 'Not specified',
        specialties: u.specialties || [],
        verified: u.verified || false,
        backgroundChecked: u.background_checked || false,
        rating: parseFloat(u.rating) || null,
        reviewCount: u.review_count || 0,
        joinedAt: u.created_at,
        joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        matches: parseInt(u.match_count) || 0,
      })),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, email, role, status } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (email) { updates.push(`email = $${idx++}`); params.push(email.toLowerCase()); }
    if (role) { updates.push(`role = $${idx++}`); params.push(role); }
    if (status) { updates.push(`status = $${idx++}`); params.push(status); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, status`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await auditFromReq(req, 'user.update', 'user', req.params.id, { fields: { name, email, role, status } });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — SOFT delete (archive). Data is retained + auditable.
router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE users SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id, name, email, role`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found or already deleted' });
    await auditFromReq(req, 'user.delete', 'user', req.params.id, { archived: result.rows[0] });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const result = await query(
      `UPDATE users SET status = 'suspended', suspension_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
      [reason || 'No specific reason provided', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Create notification for the user
    await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'system', 'Account Suspended', $2)`,
      [req.params.id, `Your account has been suspended by an administrator. Reason: ${reason || 'No specific reason provided'}. Please contact support if you believe this is an error.`]
    );

    await auditFromReq(req, 'user.suspend', 'user', req.params.id, { reason: reason || null });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// PUT /api/admin/users/:id/restore
router.put('/users/:id/restore', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE users SET status = 'active', suspension_reason = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Create notification for the user
    await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, 'system', 'Account Restored', 'Your account has been restored. You can now use the platform normally.')`,
      [req.params.id]
    );

    await auditFromReq(req, 'user.restore', 'user', req.params.id);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Restore user error:', err);
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

// GET /api/admin/verification-queue
router.get('/verification-queue', requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT vq.id, vq.caregiver_id, vq.specialty, vq.experience, vq.documents,
              vq.background_check, vq.status, vq.created_at,
              u.name, u.email, u.photo_url,
              cp.location, cp.specialties, cp.years_experience
       FROM verification_queue vq
       JOIN users u ON u.id = vq.caregiver_id
       LEFT JOIN caregiver_profiles cp ON cp.user_id = vq.caregiver_id
       WHERE vq.status != 'awaiting_payment'
       ORDER BY vq.created_at DESC`
    );

    res.json({
      queue: result.rows.map((row: any) => ({
        id: row.id,
        caregiverId: row.caregiver_id,
        name: row.name,
        email: row.email,
        photoUrl: row.photo_url,
        specialty: row.specialty || (row.specialties?.[0] ?? 'General'),
        experience: row.experience || `${row.years_experience || 0} years`,
        location: row.location || 'Not specified',
        documents: row.documents || [],
        backgroundCheck: row.background_check,
        status: row.status,
        submittedAt: new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
      })),
    });
  } catch (err) {
    console.error('Verification queue error:', err);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

// PUT /api/admin/verification/:id
router.put('/verification/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'needs_review', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved, rejected, needs_review, or expired' });
    }

    const result = await query(
      `UPDATE verification_queue SET status = $1 WHERE id = $2 RETURNING id, caregiver_id, specialty, background_check, status`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Verification entry not found' });

    const entry = result.rows[0];

    // Determine type: is it ID Verification or Background Check?
    const isIdVerification = entry.specialty === 'Government ID Verification';
    const isBackgroundCheck = entry.specialty === 'Background Check' || entry.background_check;

    if (isIdVerification) {
      const isApproved = status === 'approved';
      await query(
        `UPDATE caregiver_profiles 
         SET verified = $1, id_verification_status = $2 
         WHERE user_id = $3`,
        [isApproved, status, entry.caregiver_id]
      );
    } else if (isBackgroundCheck) {
      const isApproved = status === 'approved';
      await query(
        `UPDATE caregiver_profiles 
         SET background_checked = $1, background_check_status = $2 
         WHERE user_id = $3`,
        [isApproved, status, entry.caregiver_id]
      );
    } else {
      // General caregiver approval
      const isApproved = status === 'approved';
      await query(
        `UPDATE caregiver_profiles 
         SET verified = $1, background_checked = $1 
         WHERE user_id = $2`,
        [isApproved, entry.caregiver_id]
      );
    }

    const caregiverResult = await query('SELECT name, email FROM users WHERE id = $1', [entry.caregiver_id]);
    if (caregiverResult.rows[0]) {
      const { name, email } = caregiverResult.rows[0];
      sendVerificationStatusEmail(email, name, status === 'approved').catch(console.error);

      // Broadcast real-time update
      await supabase.channel(`profile:${entry.caregiver_id}`).send({
        type: 'broadcast',
        event: 'verification_update',
        payload: { status },
      }).catch(() => {});
    }

    await auditFromReq(req, 'verification.update', 'caregiver', entry.caregiver_id, { status, kind: entry.specialty });
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Update verification error:', err);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// GET /api/admin/reports
router.get('/reports', requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.type, r.description, r.evidence, r.status, r.priority, r.created_at, r.ref_id,
              r.reported_user_id,
              u1.name as reported_user_name, u1.email as reported_user_email, u1.role as reported_user_role,
              u2.name as reporter_name, u2.email as reporter_email
       FROM reports r
       LEFT JOIN users u1 ON u1.id = r.reported_user_id
       LEFT JOIN users u2 ON u2.id = r.reporter_id
       ORDER BY
         CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         r.created_at DESC`
    );

    res.json({
      reports: result.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        evidence: row.evidence || [],
        status: row.status,
        priority: row.priority,
        refId: row.ref_id,
        reportedUser: row.reported_user_name || 'Unknown',
        reportedBy: row.reporter_name || 'Anonymous',
        reportedUserId: row.reported_user_id,
        reportedUserEmail: row.reported_user_email || '',
        reportedUserRole: row.reported_user_role || '',
        reporterEmail: row.reporter_email || '',
        date: new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
      })),
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PUT /api/admin/reports/:id
router.put('/reports/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!['resolved', 'dismissed', 'under_review', 'open'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE reports SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    await auditFromReq(req, 'report.update', 'report', req.params.id, { status });
    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// GET /api/admin/payments
router.get('/payments', requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.ref_id, p.amount_cents, p.currency, p.description, p.status, p.created_at,
              u.name as user_name, u.email as user_email
       FROM payments p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );

    res.json({
      payments: result.rows.map((p: any) => ({
        id: p.id,
        refId: p.ref_id,
        amount: `$${(p.amount_cents / 100).toFixed(2)}`,
        amountCents: p.amount_cents,
        description: p.description,
        status: p.status,
        userName: p.user_name,
        userEmail: p.user_email,
        date: new Date(p.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        }),
        createdAt: p.created_at,
      })),
    });
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ── GET /api/admin/staffing-verification-queue — pending pros + facilities ──
router.get('/staffing-verification-queue', requireAdmin, async (_req, res) => {
  try {
    const result = await query(
      `SELECT vq.id, vq.entity_type, vq.entity_id, vq.status, vq.created_at,
              vq.documents,
              u.name, u.email, u.photo_url,
              pp.license_type, pp.specialties, pp.years_experience, pp.bio,
              pp.location AS pro_location, pp.verification_status AS pro_status,
              pp.background_check_status,
              (SELECT json_agg(pl.* ORDER BY pl.created_at) FROM professional_licenses pl WHERE pl.professional_id = pp.id) AS licenses,
              fp.facility_name, fp.facility_type, fp.city AS fac_city, fp.state AS fac_state,
              fp.ein, fp.verification_status AS fac_status
       FROM staffing_verification_queue vq
       JOIN users u ON u.id = vq.user_id
       LEFT JOIN professional_profiles pp ON vq.entity_type = 'professional' AND pp.id = vq.entity_id
       LEFT JOIN facility_profiles fp ON vq.entity_type = 'facility' AND fp.id = vq.entity_id
       WHERE vq.status IN ('pending', 'under_review')
       ORDER BY vq.created_at ASC`
    );

    // Decrypt any encrypted document blobs for admin review (legacy/govt-ID uploads).
    const queue = result.rows.map((row: any) => ({
      ...row,
      documents: decryptArray(row.documents),
    }));
    res.json({ queue });
  } catch (err) {
    console.error('Staffing verification queue error:', err);
    res.status(500).json({ error: 'Failed to fetch staffing verification queue' });
  }
});

// ── PUT /api/admin/staffing-verification/:id — approve/reject an entity ──
router.put('/staffing-verification/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body;
    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved, rejected, or under_review' });
    }

    const vqRes = await query(
      `UPDATE staffing_verification_queue
       SET status = $1, notes = $2, reviewed_by = $3, updated_at = NOW()
       WHERE id = $4 RETURNING entity_type, entity_id, user_id`,
      [status, notes || null, req.user!.id, req.params.id]
    );
    if (vqRes.rows.length === 0) return res.status(404).json({ error: 'Verification entry not found' });
    const entry = vqRes.rows[0];

    // Reflect the decision on the entity's verification_status.
    if (entry.entity_type === 'professional') {
      await query(`UPDATE professional_profiles SET verification_status = $1, updated_at = NOW() WHERE id = $2`, [status, entry.entity_id]);
    } else if (entry.entity_type === 'facility') {
      await query(`UPDATE facility_profiles SET verification_status = $1, updated_at = NOW() WHERE id = $2`, [status, entry.entity_id]);
    }

    // Notify the user (in-app + email).
    const uRes = await query('SELECT name, email FROM users WHERE id = $1', [entry.user_id]);
    if (uRes.rows[0]) {
      const { name, email } = uRes.rows[0];
      await query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, $2, $3, $4)`,
        [entry.user_id, status === 'approved' ? 'verification_approved' : 'verification_rejected',
         status === 'approved' ? 'You are verified!' : 'Verification update',
         status === 'approved'
           ? 'Your account has been approved — you can now ' + (entry.entity_type === 'facility' ? 'post shifts.' : 'apply to shifts.')
           : 'Your verification needs attention. ' + (notes || 'Please review your submitted details.')]
      ).catch(() => {});
      sendVerificationStatusEmail(email, name, status === 'approved', notes).catch(console.error);
      await supabase.channel(`profile:${entry.user_id}`).send({
        type: 'broadcast', event: 'verification_update', payload: { status },
      }).catch(() => {});
    }

    await auditFromReq(req, 'staffing_verification.update', entry.entity_type, entry.entity_id, { status, notes: notes || null });
    res.json({ message: `Verification ${status}`, entityType: entry.entity_type });
  } catch (err) {
    console.error('Staffing verification update error:', err);
    res.status(500).json({ error: 'Failed to update staffing verification' });
  }
});

// GET /api/admin/audit-logs — paginated admin action history
router.get('/audit-logs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = '1', action } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limit = 30;
    const offset = (pageNum - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM admin_audit_logs ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `SELECT id, admin_email, action, entity_type, entity_id, metadata, created_at
       FROM admin_audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);
    res.json({
      logs: result.rows,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
