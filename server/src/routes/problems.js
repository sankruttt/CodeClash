import { Router } from 'express';
import * as problemController from '../controllers/problemController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, problemController.getAllProblems);
router.get('/random', optionalAuth, problemController.getRandomProblems);
router.get('/:id', optionalAuth, problemController.getProblem);

export default router;
