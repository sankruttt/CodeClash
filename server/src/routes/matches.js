import { Router } from 'express';
import * as matchController from '../controllers/matchController.js';
import { validate, createMatchSchema, joinMatchSchema } from '../validators/index.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Create match: supports both v2 API and frontend matchAPI.createMatch
router.post('/create', optionalAuth, validate(createMatchSchema), matchController.createMatch);
router.post('/', optionalAuth, validate(createMatchSchema), matchController.createMatch);

// Join match
router.post('/join', authMiddleware, validate(joinMatchSchema), matchController.joinExistingMatch);

// By room code
router.get('/by-code/:code', authMiddleware, matchController.getMatchByCode);

// Match details
router.get('/:id', optionalAuth, matchController.getMatch);

// Match progression
router.post('/:id/start', optionalAuth, matchController.startBattle);
router.post('/:id/progress', optionalAuth, matchController.updateProgress);
router.post('/:id/complete', optionalAuth, matchController.completeBattle);

export default router;
