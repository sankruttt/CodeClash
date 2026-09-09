import { Router } from 'express';
import * as problemController from '../controllers/problemController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, problemController.getAllProblems);
router.get('/random', authMiddleware, problemController.getRandomProblems);
router.get('/:id', authMiddleware, problemController.getProblem);

export default router;
