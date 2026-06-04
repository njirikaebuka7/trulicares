import { Router, raw } from 'express';
import { verifyWebhookSignature } from '../services/turn.js';
import { applyTurnResult } from '../services/backgroundCheck.js';

/**
 * Turn.ai webhook receiver. Mounted with a raw body parser so we can verify the
 * signature HMAC before trusting the payload. Updates background_check_status when a
 * check changes (pending / processing / passed / needs_review / failed / expired / cancelled).
 */
const router = Router();

router.post('/webhook', raw({ type: '*/*' }), async (req, res) => {
  const signature =
    req.header('X-Turn-Signature') || req.header('x-turn-signature') ||
    req.header('Turn-Signature') || req.header('X-Signature');
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Ack fast; Turn retries on non-2xx.
  res.status(200).json({ received: true });

  try {
    // Be tolerant of payload shape: support {type,data:{...}} and flat {event,...}.
    const obj = event.data?.object || event.data || event.check || event;
    const checkId = obj.id || obj.check_id || obj.background_check_id;
    const candidateId = obj.candidate_id || obj.candidate?.id;
    const status = obj.status || event.status;
    const result = obj.result || obj.adjudication || obj.summary || event.result;

    if (checkId || candidateId) {
      await applyTurnResult({ checkId, candidateId, status, result });
    } else {
      console.log('[turn] webhook missing check/candidate id:', event.type || event.event);
    }
  } catch (err: any) {
    console.error('[turn] webhook processing error:', err?.message);
  }
});

export default router;
