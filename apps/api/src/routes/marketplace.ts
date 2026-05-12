import { Router } from 'express';
import authRouter from './auth.js';
import caregiversRouter from './caregivers.js';
import requestsRouter from './requests.js';
import matchesRouter from './matches.js';
import messagesRouter from './messages.js';
import scheduleRouter from './schedule.js';
import reviewsRouter from './reviews.js';
import earningsRouter from './earnings.js';

const router = Router();

// Mount all core marketplace endpoints as a single unified module
router.use('/auth', authRouter);
router.use('/caregivers', caregiversRouter);
router.use('/care-requests', requestsRouter);
router.use('/matches', matchesRouter);
router.use('/conversations', messagesRouter);
router.use('/schedule', scheduleRouter);
router.use('/reviews', reviewsRouter);
router.use('/earnings', earningsRouter);

export default router;
