import Stripe from 'stripe';
import { query } from './db.js';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    const secret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_SECRET_KEY not set');

    const stripe = new Stripe(secret);

    let event: Stripe.Event;
    if (webhookSecret) {
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
        if (pi.metadata?.matchId) {
          await query(
            `UPDATE matches SET messaging_unlocked = true WHERE id = $1`,
            [pi.metadata.matchId]
          );
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
          await query(
            `INSERT INTO payments (user_id, amount_cents, currency, stripe_payment_intent_id, description, status)
             VALUES ($1, $2, $3, $4, 'Messaging Unlock', 'succeeded')`,
            [session.metadata.userId, session.amount_total, session.currency, session.payment_intent]
          );
          await query(
            `UPDATE matches SET messaging_unlocked = true WHERE id = $1`,
            [session.metadata.matchId]
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
