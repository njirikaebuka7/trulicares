import { Router } from 'express';
import professionalsRouter from './professionals.js';
import facilitiesRouter from './facilities.js';
import shiftsRouter from './shifts.js';
import applicationsRouter from './applications.js';
import checkinRouter from './checkin.js';
import walletRouter from './wallet.js';
import disputesRouter from './disputes.js';
import messagesRouter from './messages.js';
import ratingsRouter from './ratings.js';

const router = Router();

router.use('/professionals', professionalsRouter);
router.use('/facilities', facilitiesRouter);
router.use('/shifts', shiftsRouter);
router.use('/applications', applicationsRouter);
router.use('/checkin', checkinRouter);    // /api/staffing/checkin/:bookingId etc.
router.use('/wallet', walletRouter);
router.use('/disputes', disputesRouter);
router.use('/conversations', messagesRouter); // in-app chat (facility <-> professional)
router.use('/ratings', ratingsRouter);

export default router;
