import { getGlobalLeaderboard, getUserRank, getUserMatchHistory } from '../services/scoringService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';

export const getLeaderboard = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const sortBy = req.query.sortBy || 'rating';
  const stack = req.query.stack;
  const search = req.query.search;

  const result = await getGlobalLeaderboard({ page, limit, sortBy, stack, search });

  res.json({
    success: true,
    data: {
      leaderboard: result.leaderboard,
      top3: result.top3,
      pagination: result.pagination
    }
  });
});

export const getMyRankController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  const user = await User.findById(userId).select('username name avatar color rating wins losses draws streak primaryStack');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  const rank = await getUserRank(userId);

  res.json({
    success: true,
    data: {
      rank,
      user: {
        id: user._id,
        name: user.name || user.username,
        username: user.username,
        avatar: user.avatar,
        color: user.color,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses,
        streak: Math.max(0, user.streak || 0),
        stack: user.primaryStack || 'Python',
        primaryStack: user.primaryStack || 'Python',
        rank
      }
    }
  });
});

export const getUserRankController = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId.startsWith('user_') || userId.startsWith('guest_')) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User has no ranking yet'
    });
  }

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
  const limit = parseInt(req.query.limit, 10) || 50;

  const history = await getUserMatchHistory(userId, limit);

  res.json({
    success: true,
    data: { history, count: history.length }
  });
});

export default { getLeaderboard, getMyRankController, getUserRankController, getHistory };
