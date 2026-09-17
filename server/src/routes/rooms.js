import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/create', optionalAuth, roomController.create);
router.post('/join', optionalAuth, roomController.join);
router.get('/:code', optionalAuth, roomController.getRoom);
router.put('/:code/settings', optionalAuth, roomController.updateSettings);
router.post('/:code/leave', optionalAuth, roomController.leave);
router.post('/:code/abandon', optionalAuth, roomController.abandon);
router.post('/:code/start', optionalAuth, roomController.start);

export default router;
