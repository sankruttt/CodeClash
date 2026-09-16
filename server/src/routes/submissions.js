import { Router } from 'express';
import * as submissionController from '../controllers/submissionController.js';
import { validate, submitCodeSchema } from '../validators/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.use(optionalAuth);

router.post('/run', submissionController.run);
router.post('/', validate(submitCodeSchema), submissionController.submit);
router.get('/match/:matchId', submissionController.getMatchSubmissions);

export default router;
