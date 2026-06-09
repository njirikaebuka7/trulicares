import { Router } from 'express';
import { optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { byUserOrIp, rateLimiter } from '../middleware/rateLimiter.js';
import {
  chatWithAssistant,
  getConversationForViewer,
  isAssistantError,
} from '../assistant/service.js';

const router = Router();

router.use(optionalAuth);
router.use(rateLimiter(20, 60 * 1000, { prefix: 'assistant', keyBy: byUserOrIp }));

router.get('/conversations/:id', async (req: AuthRequest, res) => {
  try {
    const guestTokenRaw = req.query.guestToken;
    const guestToken = typeof guestTokenRaw === 'string' ? guestTokenRaw : undefined;
    const conversationId = String(req.params.id);
    const conversation = await getConversationForViewer(conversationId, guestToken, req.user);
    res.json(conversation);
  } catch (err) {
    if (isAssistantError(err)) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Assistant conversation load failed:', err);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
});

router.post('/chat', async (req: AuthRequest, res) => {
  try {
    const result = await chatWithAssistant(
      {
        conversationId: req.body?.conversationId,
        guestToken: req.body?.guestToken,
        message: req.body?.message,
        pagePath: req.body?.pagePath,
        pageTitle: req.body?.pageTitle,
      },
      req.user
    );
    res.json(result);
  } catch (err) {
    if (isAssistantError(err)) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Assistant chat failed:', err);
    res.status(500).json({ error: 'Assistant is unavailable right now' });
  }
});

export default router;
