import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, leaderboardController.getLeaderboard);
router.get('/me', authMiddleware, leaderboardController.getMyRankController);
router.get('/history/me', authMiddleware, leaderboardController.getHistory);
router.get('/rank/:userId', optionalAuth, leaderboardController.getUserRankController);

export default router;
