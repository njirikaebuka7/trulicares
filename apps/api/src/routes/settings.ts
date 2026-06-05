import { Router } from 'express';
import { getPublicSettings } from '../services/settings.js';

const router = Router();

// GET /api/settings/public — public site config for the footer + contact page (no auth).
router.get('/public', async (_req, res) => {
  try {
    res.json(await getPublicSettings());
  } catch (err) {
    console.error('Public settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

export default router;
