import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT id, type, title, content, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );

    const unreadCount = result.rows.filter((n: any) => !n.read).length;

    res.json({
      notifications: result.rows.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        read: n.read,
        createdAt: n.created_at,
        timeAgo: getTimeAgo(new Date(n.created_at)),
      })),
      unreadCount,
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    await query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    await query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user!.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default router;
