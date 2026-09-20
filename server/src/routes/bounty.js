import { Router } from 'express';
import * as bountyController from '../controllers/bountyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, bountyController.getStatus);
router.post('/start', authMiddleware, bountyController.start);
router.post('/:matchId/complete', authMiddleware, bountyController.completeBounty);

export default router;