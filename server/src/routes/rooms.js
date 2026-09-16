import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';

const router = Router();

router.post('/create', roomController.create);
router.post('/join', roomController.join);
router.get('/:code', roomController.getRoom);
router.post('/:code/leave', roomController.leave);
router.post('/:code/start', roomController.start);

export default router;
