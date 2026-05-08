import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sendVerificationStatusEmail } from '../services/email.js';

const router = Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [usersResult, caregiversResult, reportsResult, pendingResult, matchesResult, revenueResult, growthResult] = await Promise.all([
      query(`SELECT
               COUNT(*) as total,
               COUNT(CASE WHEN role = 'family' THEN 1 END) as families,
               COUNT(CASE WHEN role = 'caregiver' THEN 1 END) as caregivers,
               COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
             FROM users WHERE role != 'admin'`),
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
        newSignupsThisMonth: parseInt(users.new_this_month),
        verifiedCaregivers: parseInt(caregivers.verified),
        backgroundChecked: parseInt(caregivers.background_checked),
        openReports: parseInt(reportsResult.rows[0].open),
        pendingVerifications: parseInt(pendingResult.rows[0].pending),
        activeMatches: parseInt(matchesResult.rows[0].active),
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

    const conditions: string[] = ["u.role != 'admin'"];
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
      `SELECT u.id, u.name, u.email, u.role, u.status, u.photo_url, u.created_at,
              cp.verified, cp.background_checked, cp.rating, cp.review_count, cp.location,
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
        location: u.location || 'Not specified',
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
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
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
      `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
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
              vq.background_check, vq.status, vq.submitted_at,
              u.name, u.email, u.photo_url,
              cp.location, cp.specialties, cp.years_experience
       FROM verification_queue vq
       JOIN users u ON u.id = vq.caregiver_id
       LEFT JOIN caregiver_profiles cp ON cp.user_id = vq.caregiver_id
       ORDER BY vq.submitted_at DESC`
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
        submittedAt: new Date(row.submitted_at).toLocaleDateString('en-US', {
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
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }

    const result = await query(
      `UPDATE verification_queue SET status = $1 WHERE id = $2 RETURNING id, caregiver_id, status`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Verification entry not found' });

    const entry = result.rows[0];

    if (status === 'approved') {
      await query(`UPDATE caregiver_profiles SET verified = true WHERE user_id = $1`, [entry.caregiver_id]);
    }

    const caregiverResult = await query('SELECT name, email FROM users WHERE id = $1', [entry.caregiver_id]);
    if (caregiverResult.rows[0]) {
      const { name, email } = caregiverResult.rows[0];
      sendVerificationStatusEmail(email, name, status === 'approved').catch(console.error);
    }

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
      `SELECT r.id, r.type, r.description, r.evidence, r.status, r.priority, r.created_at,
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
    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;
