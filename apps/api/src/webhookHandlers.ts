import Stripe from 'stripe';
import { query } from './db.js';

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
              `INSERT INTO payments (user_id, match_id, amount_cents, currency, stripe_payment_intent_id, description, status)
               VALUES ($1, $2, $3, $4, 'Messaging Unlock', 'succeeded')`,
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
        }
        console.log('✓ Checkout completed:', session.id);
        break;
      }
      default:
        console.log('Unhandled webhook event:', event.type);
    }
  }
}
