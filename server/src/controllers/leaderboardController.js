import { getGlobalLeaderboard, getUserRank, getUserMatchHistory } from '../services/scoringService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const sortBy = req.query.sortBy || 'rating';
  
  const leaderboard = await getGlobalLeaderboard(limit, sortBy);
  
  res.json({
    success: true,
    data: { leaderboard, count: leaderboard.length }
  });
});

export const getUserRankController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const rank = await getUserRank(userId);
  
  if (rank === null) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User has no ranking yet'
    });
  }
  
  res.json({
    success: true,
    data: { rank }
  });
});

export const getHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  
  const history = await getUserMatchHistory(userId, limit);
  
  res.json({
    success: true,
    data: { history, count: history.length }
  });
});

export default { getLeaderboard, getUserRankController, getHistory };
