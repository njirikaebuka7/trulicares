import { Router } from 'express';
import { query } from '../db.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { notifyAdmins } from '../services/notify.js';

/** Public support — create a ticket (no auth required; rate-limited). */
const router = Router();

router.post('/tickets', writeLimiter, async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body || {};
    if (!subject?.trim() || !message?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Email, subject and message are required' });
    }
    // Link to a user account if the email matches one.
    const userRes = await query('SELECT id FROM users WHERE email = $1', [String(email).toLowerCase()]).catch(() => ({ rows: [] as any[] }));
    const r = await query(
      `INSERT INTO support_tickets (user_id, name, email, subject, message, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userRes.rows[0]?.id || null, name || null, String(email).toLowerCase(), subject.trim(), message.trim(), category || null]
    );
    await notifyAdmins({
      subject: 'New support ticket',
      heading: 'New support ticket',
      message: `${name || email}: ${subject}`,
      includeSupportAdmins: true,
    }).catch(() => {});
    res.status(201).json({ success: true, id: r.rows[0].id });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to submit your message' });
  }
});

export default router;
