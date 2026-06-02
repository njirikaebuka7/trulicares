import { query, supabase } from '../../db.js';
import { enqueueEmail } from '../queues.js';
import type { NotificationJob } from '../queues.js';

/**
 * Fans out a notification: persists the in-app row, broadcasts realtime, and optionally
 * mirrors it to email. Safe to call inline (fallback) or from the worker.
 */
export async function processNotification(job: NotificationJob): Promise<void> {
  const { userId, type, title, content, broadcast, email } = job;

  let row: any = null;
  try {
    const res = await query(
      `INSERT INTO notifications (user_id, type, title, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, type, title, content]
    );
    row = res.rows[0];
  } catch (err: any) {
    console.error('[notification] persist failed:', err?.message);
  }

  if (broadcast) {
    await supabase
      .channel(broadcast.channel)
      .send({ type: 'broadcast', event: broadcast.event, payload: broadcast.payload ?? row ?? {} })
      .catch(() => {});
  } else if (row) {
    // Default: push to the user's notification channel.
    await supabase
      .channel(`notifications:${userId}`)
      .send({ type: 'broadcast', event: 'new_notification', payload: row })
      .catch(() => {});
  }

  if (email) {
    await enqueueEmail(email.template, email.to, email.data ?? {});
  }
}
