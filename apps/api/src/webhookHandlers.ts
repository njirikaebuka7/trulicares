import Stripe from 'stripe';
import { getClient, query, supabase } from './db.js';

async function broadcastStaffingUpdate(bookingId: string, event: string, payload: Record<string, unknown> = {}) {
  const bookingRes = await query(
    `SELECT sb.id, sb.shift_id, pp.user_id AS pro_user_id, fp.user_id AS facility_user_id
     FROM shift_bookings sb
     JOIN professional_profiles pp ON pp.id = sb.professional_id
     JOIN facility_profiles fp ON fp.id = sb.facility_id
     WHERE sb.id = $1`,
    [bookingId]
  );
  const booking = bookingRes.rows[0];
  if (!booking) return;

  await supabase.channel(`booking:${bookingId}`).send({
    type: 'broadcast',
    event,
    payload: { bookingId, shiftId: booking.shift_id, ...payload },
  }).catch(() => {});
  await supabase.channel(`facility:${booking.facility_user_id}`).send({
    type: 'broadcast',
    event: 'shift_status_change',
    payload: { bookingId, shiftId: booking.shift_id, event, ...payload },
  }).catch(() => {});
  await supabase.channel(`professional:${booking.pro_user_id}`).send({
    type: 'broadcast',
    event: 'booking_status_change',
    payload: { bookingId, shiftId: booking.shift_id, event, ...payload },
  }).catch(() => {});
}

async function markStaffingBookingPaid(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const bookingRes = await client.query(
      `SELECT id, wage_amount, platform_fee_amount, status
       FROM shift_bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId]
    );
    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return;
    }

    if (booking.status === 'awaiting_payment') {
      await client.query(
        `UPDATE shift_bookings
         SET status = 'paid',
             stripe_session_id = $1,
             stripe_payment_intent_id = $2,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [session.id, session.payment_intent || session.id, bookingId]
      );
      await client.query(
        `INSERT INTO shift_escrow (booking_id, amount_held, fee_held, status)
         VALUES ($1, $2, $3, 'holding')
         ON CONFLICT (booking_id) DO NOTHING`,
        [bookingId, booking.wage_amount, booking.platform_fee_amount]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await broadcastStaffingUpdate(bookingId, 'payment_confirmed', {
    status: 'paid',
    stripeSessionId: session.id,
  });
}

async function expireStaffingBooking(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const bookingRes = await client.query(
      `SELECT id, shift_id, application_id, status
       FROM shift_bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId]
    );
    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return;
    }

    if (booking.status === 'awaiting_payment') {
      await client.query(
        `UPDATE shift_bookings
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [bookingId]
      );
      await client.query(
        `UPDATE shift_applications
         SET status = 'pending', reviewed_at = NULL
         WHERE id = $1 AND status = 'accepted'`,
        [booking.application_id]
      );
      await client.query(
        `UPDATE shifts
         SET status = 'open',
             slots_filled = GREATEST(slots_filled - 1, 0),
             updated_at = NOW()
         WHERE id = $1 AND status = 'filled'`,
        [booking.shift_id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await broadcastStaffingUpdate(bookingId, 'payment_expired', {
    status: 'cancelled',
    stripeSessionId: session.id,
  });
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    const secret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_SECRET_KEY not set');

    const stripe = new Stripe(secret);

    let event: Stripe.Event;
    const isPlaceholderSecret = webhookSecret?.startsWith('whsec_...');
    
    if (webhookSecret && !isPlaceholderSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await query(
          `UPDATE payments SET status = 'succeeded' WHERE stripe_payment_intent_id = $1`,
          [pi.id]
        );
        if (pi.metadata?.matchId && pi.metadata?.userId) {
          await query(
            `UPDATE matches SET messaging_unlocked = true WHERE id = $1`,
            [pi.metadata.matchId]
          );
          // Auto create conversation
          const matchRes = await query(`SELECT caregiver_id FROM matches WHERE id = $1`, [pi.metadata.matchId]);
          if (matchRes.rows.length > 0) {
            const caregiverId = matchRes.rows[0].caregiver_id;
            await query(
              `INSERT INTO conversations (family_id, caregiver_id, match_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (family_id, caregiver_id) DO UPDATE
                 SET updated_at = NOW(),
                     match_id = COALESCE(conversations.match_id, EXCLUDED.match_id)`,
              [pi.metadata.userId, caregiverId, pi.metadata.matchId]
            );
          }
        }
        console.log('✓ Payment succeeded:', pi.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await query(
          `UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = $1`,
          [pi.id]
        );
        console.log('✗ Payment failed:', pi.id);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'unlock' && session.metadata?.matchId && session.metadata?.userId) {
          // Check if we already have a pending record for this session
          const existing = await query(`SELECT id FROM payments WHERE (stripe_payment_intent_id = $1 OR (match_id = $2 AND user_id = $3)) AND status = 'pending'`, [session.id, session.metadata.matchId, session.metadata.userId]);
          
          if (existing.rows.length > 0) {
            await query(
              `UPDATE payments SET status = 'succeeded', stripe_payment_intent_id = $1, amount_cents = $2 WHERE id = $3`,
              [session.payment_intent || session.id, session.amount_total, existing.rows[0].id]
            );
          } else {
            await query(
              `INSERT INTO payments (user_id, match_id, amount_cents, currency, stripe_payment_intent_id, description, status, ref_id)
               VALUES ($1, $2, $3, $4, $5, 'Messaging Unlock', 'succeeded', generate_payment_ref())`,
              [session.metadata.userId, session.metadata.matchId, session.amount_total, session.currency, session.payment_intent || session.id]
            );
          }
          await query(
            `UPDATE matches SET messaging_unlocked = true WHERE id = $1`,
            [session.metadata.matchId]
          );
          // Auto create conversation
          const matchRes = await query(`SELECT caregiver_id FROM matches WHERE id = $1`, [session.metadata.matchId]);
          if (matchRes.rows.length > 0) {
            const caregiverId = matchRes.rows[0].caregiver_id;
            await query(
              `INSERT INTO conversations (family_id, caregiver_id, match_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (family_id, caregiver_id) DO UPDATE
                 SET updated_at = NOW(),
                     match_id = COALESCE(conversations.match_id, EXCLUDED.match_id)`,
              [session.metadata.userId, caregiverId, session.metadata.matchId]
            );
          }
        } else if (session.metadata?.type === 'background_check' && session.metadata?.userId) {
          const userId = session.metadata.userId;
          // Update payment record
          await query(
            `UPDATE payments SET status = 'succeeded', stripe_payment_intent_id = $1
             WHERE user_id = $2 AND stripe_payment_intent_id = $3`,
            [session.payment_intent || session.id, userId, session.id]
          );

          // Create verification queue entry
          await query(
            `INSERT INTO verification_queue (caregiver_id, specialty, experience, documents, background_check, status, submitted_at)
             VALUES ($1, $2, $3, $4, true, 'pending', NOW())
             ON CONFLICT DO NOTHING`,
            [userId, 'General Care', 'N/A', JSON.stringify([{ name: 'Paid Premium Background Verification', url: '#' }])]
          );
        } else if (session.metadata?.type === 'staffing_shift' && session.metadata?.booking_id) {
          await markStaffingBookingPaid(session);
        }
        console.log('✓ Checkout completed:', session.id);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'staffing_shift' && session.metadata?.booking_id) {
          await expireStaffingBooking(session);
        }
        console.log('Checkout expired:', session.id);
        break;
      }
      default:
        console.log('Unhandled webhook event:', event.type);
    }
  }
}
