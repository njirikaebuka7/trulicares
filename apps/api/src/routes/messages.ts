import { Router } from 'express';
import { query, supabase } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendMessageNotification } from '../services/email.js';

const router = Router();

// GET /api/conversations
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, role } = req.user!;

    const result = await query(
      `SELECT c.id, c.family_id, c.caregiver_id, c.match_id, c.created_at, c.updated_at,
              uf.name as family_name, uf.photo_url as family_photo, uf.phone as family_phone,
              uc.name as caregiver_name, uc.photo_url as caregiver_photo, uc.phone as caregiver_phone,
              cp.job_title as caregiver_role,
              COALESCE(m.messaging_unlocked, false) as messaging_unlocked,
              m.care_date,
              m.id as resolved_match_id,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) as unread_count
       FROM conversations c
       JOIN users uf ON uf.id = c.family_id
       JOIN users uc ON uc.id = c.caregiver_id
       LEFT JOIN caregiver_profiles cp ON cp.user_id = c.caregiver_id
       LEFT JOIN LATERAL (
         SELECT m2.id, m2.messaging_unlocked, m2.care_date
         FROM matches m2
         WHERE m2.family_id = c.family_id AND m2.caregiver_id = c.caregiver_id
           AND m2.status = 'accepted'
         ORDER BY m2.messaging_unlocked DESC, m2.created_at DESC
         LIMIT 1
       ) m ON true
       WHERE c.family_id = $1 OR c.caregiver_id = $1
       ORDER BY c.updated_at DESC`,
      [id]
    );

    const conversations = result.rows.map((row: any) => {
      const isFamily = role === 'family';
      const otherId = isFamily ? row.caregiver_id : row.family_id;
      const otherName = isFamily ? row.caregiver_name : row.family_name;
      const otherPhoto = isFamily ? row.caregiver_photo : row.family_photo;
      const otherPhone = isFamily ? row.caregiver_phone : row.family_phone;
      const otherRole = isFamily ? (row.caregiver_role || 'Caregiver') : 'Family';

      const careDate = row.care_date ? new Date(row.care_date) : null;
      const hoursElapsed = careDate ? (Date.now() - careDate.getTime()) / 3600000 : 0;
      const messagingUnlocked: boolean = row.messaging_unlocked && (!careDate || hoursElapsed <= 48);

      return {
        id: row.id,
        familyId: row.family_id,
        caregiverId: row.caregiver_id,
        matchId: row.resolved_match_id || row.match_id || null,
        otherId,
        otherName,
        otherPhoto: otherPhoto || null,
        otherPhone: otherPhone || null,
        otherRole,
        messagingUnlocked,
        careDate: row.care_date || null,
        lastMessage: row.last_message || '',
        lastMessageAt: row.last_message_at || row.updated_at,
        unreadCount: parseInt(row.unread_count) || 0,
        updatedAt: row.updated_at,
      };
    });

    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Helper — verify an active, unexpired messaging window exists between family + caregiver
async function checkMessagingEligible(familyId: string, caregiverId: string): Promise<boolean> {
  const r = await query(
    `SELECT id FROM matches
     WHERE family_id = $1 AND caregiver_id = $2
       AND status = 'accepted'
       AND messaging_unlocked = true
       AND (care_date IS NULL OR EXTRACT(EPOCH FROM (NOW() - care_date)) / 3600 < 48)
     LIMIT 1`,
    [familyId, caregiverId]
  );
  return r.rows.length > 0;
}

// POST /api/conversations — start or get existing
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ error: 'otherUserId is required' });

    const { id: myId, role } = req.user!;

    const otherUserResult = await query('SELECT id, role FROM users WHERE id = $1', [otherUserId]);
    if (otherUserResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    let familyId: string, caregiverId: string;
    if (role === 'family') {
      familyId = myId;
      caregiverId = otherUserId;
    } else {
      familyId = otherUserId;
      caregiverId = myId;
    }

    // Enforce: messaging must be unlocked via an accepted match within the 48 h window
    // (admins bypass this check)
    if (role !== 'admin') {
      const eligible = await checkMessagingEligible(familyId, caregiverId);
      if (!eligible) {
        return res.status(403).json({ error: 'Messaging is not unlocked or has expired for this match.' });
      }
    }

    // Look up the accepted match to link it to the conversation
    const matchLookup = await query(
      `SELECT id FROM matches WHERE family_id = $1 AND caregiver_id = $2 AND status = 'accepted'
       ORDER BY messaging_unlocked DESC, created_at DESC LIMIT 1`,
      [familyId, caregiverId]
    );
    const matchId: string | null = matchLookup.rows[0]?.id || null;

    // Upsert conversation, storing match_id; backfill if previously null
    const result = await query(
      `INSERT INTO conversations (family_id, caregiver_id, match_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, caregiver_id) DO UPDATE
         SET updated_at = NOW(),
             match_id = COALESCE(conversations.match_id, EXCLUDED.match_id)
       RETURNING id`,
      [familyId, caregiverId, matchId]
    );

    res.json({ conversationId: result.rows[0].id });
  } catch (err) {
    console.error('Start conversation error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;

    // Verify user is part of this conversation
    const convResult = await query(
      'SELECT id, family_id, caregiver_id FROM conversations WHERE id = $1 AND (family_id = $2 OR caregiver_id = $2)',
      [req.params.id, userId]
    );
    if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    // Mark messages in this conversation as read
    await query(
      `UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [req.params.id, userId]
    ).catch(err => console.error('Error marking messages as read:', err));

    const messagesResult = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
              u.name as sender_name, u.photo_url as sender_photo
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    const msgs = messagesResult.rows.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderPhoto: m.sender_photo,
      content: m.content,
      createdAt: m.created_at,
      isOwn: m.sender_id === userId,
    }));

    res.json({ messages: msgs });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { id: userId, role } = req.user!;

    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

    const convResult = await query(
      'SELECT id, family_id, caregiver_id FROM conversations WHERE id = $1 AND (family_id = $2 OR caregiver_id = $2)',
      [req.params.id, userId]
    );
    if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    const conv = convResult.rows[0];

    // Enforce messaging eligibility (admins bypass)
    if (role !== 'admin') {
      const eligible = await checkMessagingEligible(conv.family_id, conv.caregiver_id);
      if (!eligible) {
        return res.status(403).json({ error: 'Messaging is not unlocked or has expired for this match.' });
      }
    }

    const msgResult = await query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [req.params.id, userId, content.trim()]
    );

    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    const msg = msgResult.rows[0];

    // Realtime: push to the conversation channel so the recipient updates instantly
    // (replaces aggressive client polling).
    await supabase
      .channel(`conversation:${req.params.id}`)
      .send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          createdAt: msg.created_at,
        },
      })
      .catch(() => {});

    // Notify the other person
    const otherId = conv.family_id === userId ? conv.caregiver_id : conv.family_id;
    query('SELECT name, email FROM users WHERE id = $1', [otherId])
      .then(async (r: any) => {
        if (r.rows[0]) {
          const senderResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
          const senderName = senderResult.rows[0]?.name || 'Someone';
          sendMessageNotification(r.rows[0].email, r.rows[0].name, senderName).catch(console.error);
        }
      })
      .catch(console.error);

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
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});
// POST /api/conversations/:id/video
router.post('/:id/video', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: userId, role } = req.user!;
    const convId = req.params.id;

    // Verify conversation access
    const convResult = await query(
      'SELECT id, family_id, caregiver_id FROM conversations WHERE id = $1 AND (family_id = $2 OR caregiver_id = $2)',
      [convId, userId]
    );
    if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convResult.rows[0];

    // Enforce messaging eligibility
    if (role !== 'admin') {
      const eligible = await checkMessagingEligible(conv.family_id, conv.caregiver_id);
      if (!eligible) {
        return res.status(403).json({ error: 'Messaging is not unlocked or has expired for this match.' });
      }
    }

    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    if (!DAILY_API_KEY) {
      return res.status(500).json({ error: 'Video calling is not configured properly (missing API key).' });
    }

    // Call Daily API to create a room
    const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200, // Expires in 2 hours
          enable_chat: true,
          enable_screenshare: true,
        },
      }),
    });

    if (!dailyRes.ok) {
      const errorText = await dailyRes.text();
      console.error('Daily API Error:', errorText);
      return res.status(500).json({ error: 'Failed to generate video room.' });
    }

    const roomData = await dailyRes.json();
    const roomUrl = roomData.url;

    // Generate the chat message
    const content = `[VIDEO_CALL:${roomUrl}]`;
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [convId, userId, content]
    );

    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [convId]);
    const msg = msgResult.rows[0];

    // Realtime Broadcast
    await supabase
      .channel(`conversation:${convId}`)
      .send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          createdAt: msg.created_at,
        },
      })
      .catch(() => {});

    // Notifications
    const otherId = conv.family_id === userId ? conv.caregiver_id : conv.family_id;
    query('SELECT name, email FROM users WHERE id = $1', [otherId]).then(async (r: any) => {
      if (r.rows[0]) {
        const senderResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
        const senderName = senderResult.rows[0]?.name || 'Someone';
        sendMessageNotification(r.rows[0].email, r.rows[0].name, senderName).catch(console.error);
      }
    }).catch(console.error);

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
    console.error('Video room error:', err);
    res.status(500).json({ error: 'Failed to create video call' });
  }
});

export default router;
