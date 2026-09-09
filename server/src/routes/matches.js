import { Router } from 'express';
import * as matchController from '../controllers/matchController.js';
import { validate, createMatchSchema, joinMatchSchema } from '../validators/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);  // All match routes require auth

router.post('/', validate(createMatchSchema), matchController.createMatch);
router.post('/join', validate(joinMatchSchema), matchController.joinExistingMatch);
router.get('/by-code/:code', matchController.getMatchByCode);
router.get('/:id', matchController.getMatch);
router.post('/:id/start', matchController.startBattle);
router.post('/:id/complete', matchController.completeBattle);

export default router;
