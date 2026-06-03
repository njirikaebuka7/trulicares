import { Router } from 'express';
import { processCleanup } from '../queues/processors/cleanup.js';

/**
 * Vercel Cron target. Lets the maintenance jobs run without an always-on worker.
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
 * set on the project, so we reject anything else. Configured in apps/api/vercel.json.
 */
const router = Router();

router.get('/cleanup', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.header('authorization');
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await processCleanup('purge-expired-otps');
    await processCleanup('prune-reset-tokens');
    await processCleanup('release-stuck-escrow');
    res.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[cron] cleanup failed:', err?.message);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;
