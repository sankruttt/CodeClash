import mongoose from 'mongoose';
import PlayerStatistics from '../models/PlayerStatistics.js';
import MatchHistory from '../models/MatchHistory.js';
import User from '../models/User.js';
import { recordUserActivity } from './streakService.js';

// ============== RATING CALCULATION (ELO) ==============

export function calculateRatingChange(playerRating, opponentRating, score) {
  // ELO rating formula
  // K-factor: 32 for new players, 16 for established
  const K = playerRating < 2100 ? 32 : 16;

  // Expected score (probability of winning)
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  // Actual score: 1 = win, 0.5 = draw, 0 = loss
  const actual = score;

  // Rating change
  const change = Math.round(K * (actual - expected));
  return change;
}

// ============== PLAYER STATISTICS ==============

export async function updatePlayerStatsAfterMatch(userId, match, playerResult) {
  let stats = await PlayerStatistics.findOne({ userId });

  if (!stats) {
    stats = new PlayerStatistics({ userId, username: playerResult.username });
  }

  const isWin = match.winner && match.winner.toString() === userId.toString();
  const isDraw = match.result === 'draw';
  const isLoss = !isWin && !isDraw;

  stats.totalMatches += 1;

  if (isWin) {
    stats.totalWins += 1;
    stats.currentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else if (isDraw) {
    stats.totalDraws += 1;
  } else if (isLoss) {
    stats.totalLosses += 1;
    stats.currentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
  }

  stats.winRate = stats.totalMatches > 0
    ? Math.round((stats.totalWins / stats.totalMatches) * 100)
    : 0;

  stats.currentRating = playerResult.ratingAfter;
  stats.peakRating = Math.max(stats.peakRating || 1500, playerResult.ratingAfter || 1500);
  stats.problemsSolved += playerResult.problemsSolved || 0;
  stats.problemsAttempted += playerResult.submissions > 0
    ? (playerResult.problemResults?.length || playerResult.problemsSolved || 0)
    : 0;
  stats.lastMatchAt = new Date();

  if (!Array.isArray(stats.ratingHistory)) {
    stats.ratingHistory = [];
  }
  stats.ratingHistory.push({
    rating: playerResult.ratingAfter,
    change: playerResult.ratingChange,
    matchId: match._id || match.id,
    date: new Date()
  });

  // Authoritative update to User model first so countDocuments is consistent
  await User.findByIdAndUpdate(userId, {
    rating: playerResult.ratingAfter,
    wins: stats.totalWins,
    losses: stats.totalLosses,
    draws: stats.totalDraws
  });

  // Calculate new live rank against updated User collection
  const higherCount = await User.countDocuments({
    isActive: { $ne: false },
    rating: { $gt: playerResult.ratingAfter }
  });
  stats.globalRank = higherCount + 1;
  await stats.save();

  // Save live rank to User model
  await User.findByIdAndUpdate(userId, { rank: stats.globalRank });

  // Record daily activity for streak progression without overwriting with match win/loss streak
  try {
    await recordUserActivity(userId, new Date());
  } catch (err) {
    console.warn('Failed to update daily streak after match:', err.message);
  }

  return stats;
}

// ============== MATCH HISTORY ==============

export async function addMatchHistory(userId, match, playerResult, opponentResult) {
  const isWin = match.winner && match.winner.toString() === userId.toString();
  const isDraw = match.result === 'draw';
  const result = isWin ? 'win' : isDraw ? 'draw' : 'loss';

  const startedAt = match.startedAt || new Date(Date.now() - (match.duration || 30) * 1000);
  const completedAt = match.completedAt || new Date();

  const oppName = opponentResult?.username || opponentResult?.name || (match.opponent || 'v0_Sniper');
  const oppAvatar = opponentResult?.avatar || (oppName ? oppName.slice(0, 2).toUpperCase() : 'VS');

  const probTitle = match.problemTitle || match.problem || match.problems?.[0]?.title || 'Algorithmic Duel';
  const probDiff = match.difficulty || match.problemData?.difficulty || match.problems?.[0]?.difficulty || 'Medium';

  const history = new MatchHistory({
    userId,
    matchId: match._id || match.id || new mongoose.Types.ObjectId(),
    opponentId: opponentResult?.userId && mongoose.Types.ObjectId.isValid(opponentResult.userId) ? opponentResult.userId : null,
    opponentName: oppName,
    opponentAvatar: oppAvatar,
    result,
    problemsSolved: playerResult.problemsSolved || 0,
    opponentProblemsSolved: typeof opponentResult?.problemsSolved === 'number' ? opponentResult.problemsSolved : (isWin ? 0 : 1),
    ratingChange: typeof playerResult.ratingChange === 'number' ? playerResult.ratingChange : (isWin ? 24 : isDraw ? 0 : -24),
    ratingAfter: typeof playerResult.ratingAfter === 'number' ? playerResult.ratingAfter : 1500,
    duration: match.duration || 0,
    matchType: match.type || 'ranked',
    problemTitle: probTitle,
    difficulty: probDiff,
    startedAt,
    completedAt,
    problems: [{
      title: probTitle,
      difficulty: probDiff,
      solved: playerResult.problemsSolved > 0,
      time: match.duration || 0
    }]
  });

  await history.save();
  return history;
}

// ============== LEADERBOARD (SERVER-SIDE PAGINATION) ==============

export async function getGlobalLeaderboard({ page = 1, limit = 20, sortBy = 'rating', stack, search } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Query filter
  const query = { isActive: { $ne: false } };
  if (stack && stack !== 'All Stacks' && stack !== 'all') {
    query.primaryStack = stack;
  }
  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { username: { $regex: s, $options: 'i' } }
    ];
  }

  // Authoritative deterministic sorting
  let sortCriteria = { rating: -1, _id: 1 };
  if (sortBy === 'wins') sortCriteria = { wins: -1, _id: 1 };
  else if (sortBy === 'streak') sortCriteria = { streak: -1, _id: 1 };

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum)
      .select('username name avatar color rating wins losses draws streak primaryStack')
      .lean()
  ]);

  const top3Docs = await User.find(query)
    .sort({ rating: -1, _id: 1 })
    .limit(3)
    .select('username name avatar color rating wins losses draws streak primaryStack')
    .lean();

  const totalPages = Math.ceil(total / limitNum) || 1;

  const mapUserToLeaderboardItem = (u, rankIndex) => {
    const totalMatches = (u.wins || 0) + (u.losses || 0) + (u.draws || 0);
    const winRate = totalMatches > 0 ? Math.round(((u.wins || 0) / totalMatches) * 100) : 0;

    return {
      rank: rankIndex,
      userId: u._id,
      id: u._id,
      username: u.username,
      name: u.name || u.username,
      avatar: u.avatar || (u.name || u.username).slice(0, 2).toUpperCase(),
      color: u.color || 'gold',
      rating: u.rating || 1500,
      wins: u.wins || 0,
      losses: u.losses || 0,
      draws: u.draws || 0,
      winRate: `${winRate}%`,
      streak: Math.max(0, u.streak || 0),
      stack: u.primaryStack || 'Python',
      primaryStack: u.primaryStack || 'Python'
    };
  };

  const leaderboard = users.map((u, i) => mapUserToLeaderboardItem(u, skip + i + 1));
  const top3 = top3Docs.map((u, i) => mapUserToLeaderboardItem(u, i + 1));

  return {
    leaderboard,
    top3,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1
    }
  };
}

export async function getUserRank(userId) {
  if (!userId) return null;

  let user = null;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).select('rating');
  }
  if (!user) {
    user = await User.findOne({ username: userId }).select('rating');
  }
  if (!user) return null;

  const higherCount = await User.countDocuments({
    isActive: { $ne: false },
    rating: { $gt: user.rating }
  });

  return higherCount + 1;
}

// ============== USER HISTORY ==============

export async function getUserMatchHistory(userId, limit = 50) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  return await MatchHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
}

export default {
  calculateRatingChange,
  updatePlayerStatsAfterMatch,
  addMatchHistory,
  getGlobalLeaderboard,
  getUserRank,
  getUserMatchHistory
};
