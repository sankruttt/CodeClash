import { Router } from 'express';
import * as playerController from '../controllers/playerController.js';

const router = Router();

router.post('/register', playerController.register);
router.get('/:id', playerController.getPlayer);

export default router;
