import { Router } from 'express';
import * as submissionController from '../controllers/submissionController.js';
import { validate, submitCodeSchema } from '../validators/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(submitCodeSchema), submissionController.submit);
router.get('/match/:matchId', submissionController.getMatchSubmissions);

export default router;
