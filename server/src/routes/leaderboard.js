import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, leaderboardController.getLeaderboard);
router.get('/history/me', authMiddleware, leaderboardController.getHistory);
router.get('/rank/:userId', authMiddleware, leaderboardController.getUserRankController);

export default router;
