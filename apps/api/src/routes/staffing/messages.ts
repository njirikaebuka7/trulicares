import { Router } from 'express';
import { query, supabase } from '../../db.js';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { enqueueEmail } from '../../queues/queues.js';

/**
 * Staffing in-app chat (facility <-> professional). Separate from the marketplace
 * family<->caregiver chat. A conversation can only exist between two parties that
 * share at least one booking (created when an application is accepted).
 */
const router = Router();

/** True if these two users (one facility, one professional) share a booking. */
async function shareBooking(facilityUserId: string, proUserId: string): Promise<boolean> {
  const r = await query(
    `SELECT 1
     FROM shift_bookings sb
     JOIN professional_profiles pp ON pp.id = sb.professional_id
     JOIN facility_profiles fp ON fp.id = sb.facility_id
     WHERE fp.user_id = $1 AND pp.user_id = $2
       AND sb.status <> 'cancelled'
     LIMIT 1`,
    [facilityUserId, proUserId]
  );
  return r.rows.length > 0;
}

// GET /api/staffing/conversations — list my threads
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const result = await query(
      `SELECT c.id, c.facility_id, c.professional_id, c.booking_id, c.updated_at,
              uf.name AS facility_name, uf.photo_url AS facility_photo,
              up.name AS professional_name, up.photo_url AS professional_photo,
              (SELECT content FROM staffing_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM staffing_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM staffing_messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) AS unread_count
       FROM staffing_conversations c
       JOIN users uf ON uf.id = c.facility_id
       JOIN users up ON up.id = c.professional_id
       WHERE c.facility_id = $1 OR c.professional_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const conversations = result.rows.map((row: any) => {
      const isFacility = row.facility_id === userId;
      return {
        id: row.id,
        bookingId: row.booking_id,
        otherId: isFacility ? row.professional_id : row.facility_id,
        otherName: isFacility ? row.professional_name : row.facility_name,
        otherPhoto: (isFacility ? row.professional_photo : row.facility_photo) || null,
        otherRole: isFacility ? 'Professional' : 'Facility',
        lastMessage: row.last_message || '',
        lastMessageAt: row.last_message_at || row.updated_at,
        unreadCount: parseInt(row.unread_count) || 0,
        updatedAt: row.updated_at,
      };
    });

    res.json({ conversations });
  } catch (err) {
    console.error('Staffing conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/staffing/conversations — start or get a thread with otherUserId
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ error: 'otherUserId is required' });
    const { id: myId, role } = req.user!;

    let facilityId: string, professionalId: string;
    if (role === 'facility') {
      facilityId = myId;
      professionalId = otherUserId;
    } else if (role === 'professional') {
      facilityId = otherUserId;
      professionalId = myId;
    } else {
      return res.status(403).json({ error: 'Only facilities and professionals can use staffing chat' });
    }

    if (!(await shareBooking(facilityId, professionalId))) {
      return res.status(403).json({ error: 'You can only message someone you have a booking with.' });
    }

    const result = await query(
      `INSERT INTO staffing_conversations (facility_id, professional_id)
       VALUES ($1, $2)
       ON CONFLICT (facility_id, professional_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [facilityId, professionalId]
    );
    res.json({ conversationId: result.rows[0].id });
  } catch (err) {
    console.error('Start staffing conversation error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// GET /api/staffing/conversations/:id/messages
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const conv = await query(
      'SELECT id, facility_id, professional_id FROM staffing_conversations WHERE id = $1 AND (facility_id = $2 OR professional_id = $2)',
      [req.params.id, userId]
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    await query(
      `UPDATE staffing_messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [req.params.id, userId]
    ).catch(() => {});

    const msgs = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
              u.name AS sender_name, u.photo_url AS sender_photo
       FROM staffing_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    res.json({
      messages: msgs.rows.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderPhoto: m.sender_photo,
        content: m.content,
        createdAt: m.created_at,
        isOwn: m.sender_id === userId,
      })),
    });
  } catch (err) {
    console.error('Get staffing messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/staffing/conversations/:id/messages
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { id: userId, name } = req.user!;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

    const convRes = await query(
      'SELECT id, facility_id, professional_id FROM staffing_conversations WHERE id = $1 AND (facility_id = $2 OR professional_id = $2)',
      [req.params.id, userId]
    );
    if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convRes.rows[0];

    const msgRes = await query(
      `INSERT INTO staffing_messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [req.params.id, userId, content.trim()]
    );
    await query('UPDATE staffing_conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    const msg = msgRes.rows[0];

    const otherId = conv.facility_id === userId ? conv.professional_id : conv.facility_id;

    // Realtime: push to a per-conversation channel + the recipient's role channel.
    await supabase
      .channel(`staffing_chat:${req.params.id}`)
      .send({ type: 'broadcast', event: 'new_message', payload: { ...msg, senderName: name } })
      .catch(() => {});
    await supabase
      .channel(`notifications:${otherId}`)
      .send({ type: 'broadcast', event: 'new_message', payload: { conversationId: req.params.id, senderName: name } })
      .catch(() => {});

    // Email the recipient (queued).
    query('SELECT name, email FROM users WHERE id = $1', [otherId])
      .then((r: any) => {
        if (r.rows[0]) {
          enqueueEmail('new-message', r.rows[0].email, {
            name: r.rows[0].name,
            senderName: name,
            preview: content.trim(),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    res.status(201).json({
      message: {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: msg.created_at,
        isOwn: true,
      },
    });
  } catch (err) {
    console.error('Send staffing message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
