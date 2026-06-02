import { Router, raw } from 'express';
import { verifyWebhookSignature } from '../services/checkr.js';
import { applyCheckrReport } from '../services/backgroundCheck.js';

/**
 * Checkr webhook receiver. Mounted with a raw body parser so we can verify the
 * X-Checkr-Signature HMAC. Handles report completion events.
 */
const router = Router();

router.post('/webhook', raw({ type: '*/*' }), async (req, res) => {
  const signature = req.header('X-Checkr-Signature') || req.header('x-checkr-signature');
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

  // Always 200 quickly; Checkr retries on non-2xx.
  res.status(200).json({ received: true });

  try {
    const type: string = event.type || '';
    const obj = event.data?.object || {};
    if (type === 'report.completed' || type === 'report.updated' || type === 'report.completed_with_results') {
      const candidateId = obj.candidate_id;
      const reportId = obj.id;
      if (candidateId && reportId) {
        await applyCheckrReport(candidateId, reportId, obj.result, obj.status);
      }
    } else {
      console.log('[checkr] unhandled event:', type);
    }
  } catch (err: any) {
    console.error('[checkr] webhook processing error:', err?.message);
  }
});

export default router;
