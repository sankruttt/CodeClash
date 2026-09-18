import { Router } from 'express';
import * as matchmakingController from '../controllers/matchmakingController.js';
import { authMiddleware } from '../middleware/auth.js';

import { validate, joinQueueSchema } from '../validators/index.js';

const router = Router();

router.use(authMiddleware);

router.post('/join', validate(joinQueueSchema), matchmakingController.joinMatchmaking);
router.post('/leave', matchmakingController.leaveMatchmaking);
router.get('/status', matchmakingController.getMatchmakingStatus);

export default router;
