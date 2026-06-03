import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { generateRefId } from '../services/utils.js';
import { notifyAdmins } from '../services/notify.js';

const router = Router();

// POST /api/reports
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reportedUserId, requestId, matchId, type, description, priority = 'medium' } = req.body;
    const reporterId = req.user!.id;

    if (!reportedUserId || !type || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let internalRequestId = null;
    if (requestId) {
      const requestRes = await query(
        'SELECT id FROM care_requests WHERE id = $1 OR ref_id = $1',
        [requestId]
      );
      if (requestRes.rows.length > 0) internalRequestId = requestRes.rows[0].id;
    }

    let internalMatchId = null;
    if (matchId) {
      const matchRes = await query('SELECT id FROM matches WHERE id = $1 OR ref_id = $1', [matchId]);
      if (matchRes.rows.length > 0) internalMatchId = matchRes.rows[0].id;
    }

    const reportRefId = generateRefId('REP');
    const result = await query(
      `INSERT INTO reports (reporter_id, reported_user_id, request_id, match_id, type, description, priority, status, ref_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
       RETURNING id, ref_id`,
      [reporterId, reportedUserId, internalRequestId, internalMatchId, type, description, priority, reportRefId]
    );

    // Alert admins by email (before responding — serverless freezes after the response).
    await notifyAdmins({
      subject: `New report: ${type}`,
      heading: 'New user report submitted',
      message: `A ${priority}-priority report (${type}) was filed and needs review.`,
      details: [
        ['Reference', result.rows[0].ref_id],
        ['Type', String(type)],
        ['Priority', String(priority)],
      ],
    });

    res.status(201).json({
      success: true,
      reportId: result.rows[0].id,
      message: 'Your report has been submitted and will be reviewed by our team.'
    });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
