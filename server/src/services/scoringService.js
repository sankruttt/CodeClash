import { isMongoConnected } from '../config/database.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import MatchHistory from '../models/MatchHistory.js';
import User from '../models/User.js';
import { inMemoryStore } from './inMemoryStore.js';

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
  if (isMongoConnected()) {
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
    stats.problemsAttempted += playerResult.submissions > 0 ? (playerResult.problemResults?.length || playerResult.problemsSolved || 0) : 0;
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
    
    await stats.save();

    await User.findByIdAndUpdate(userId, {
      rating: playerResult.ratingAfter,
      wins: stats.totalWins,
      losses: stats.totalLosses,
      draws: stats.totalDraws,
      streak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      rank: stats.globalRank
    });

    return stats;
  } else {
    // In-memory update
    const stats = inMemoryStore.getStatistics(userId);
    if (!stats) return null;
    
    const isWin = match.winner && match.winner.toString() === userId.toString();
    const isDraw = match.result === 'draw';
    
    stats.totalMatches += 1;
    
    if (isWin) {
      stats.totalWins += 1;
      stats.currentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else if (isDraw) {
      stats.totalDraws += 1;
    } else {
      stats.totalLosses += 1;
      stats.currentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
    }
    
    stats.winRate = stats.totalMatches > 0 
      ? Math.round((stats.totalWins / stats.totalMatches) * 100) 
      : 0;
    
    stats.currentRating = playerResult.ratingAfter;
    stats.peakRating = Math.max(stats.peakRating || 1500, playerResult.ratingAfter || 1500);
    stats.problemsSolved += (playerResult.problemsSolved || 0);
    stats.problemsAttempted += playerResult.submissions > 0 ? (playerResult.problemResults?.length || playerResult.problemsSolved || 0) : 0;
    stats.lastMatchAt = new Date();

    inMemoryStore.updateUser(userId, {
      rating: playerResult.ratingAfter,
      wins: stats.totalWins,
      losses: stats.totalLosses,
      draws: stats.totalDraws,
      streak: stats.currentStreak,
      bestStreak: stats.bestStreak
    });
    
    return stats;
  }
}

// ============== MATCH HISTORY ==============

export async function addMatchHistory(userId, match, playerResult, opponentResult) {
  const result = match.winner && match.winner.toString() === userId.toString() 
    ? 'win' 
    : match.result === 'draw' ? 'draw' : 'loss';
  
  if (isMongoConnected()) {
    const history = new MatchHistory({
      userId,
      matchId: match._id || match.id,
      opponentId: opponentResult?.userId,
      opponentName: opponentResult?.username,
      opponentAvatar: opponentResult?.avatar,
      result,
      problemsSolved: playerResult.problemsSolved,
      opponentProblemsSolved: opponentResult?.problemsSolved || 0,
      ratingChange: playerResult.ratingChange,
      ratingAfter: playerResult.ratingAfter,
      duration: match.duration,
      matchType: match.type
    });
    
    await history.save();
    return history;
  } else {
    return inMemoryStore.addHistory({
      userId,
      matchId: match.id,
      opponentId: opponentResult?.userId,
      opponentName: opponentResult?.username,
      opponentAvatar: opponentResult?.avatar,
      result,
      problemsSolved: playerResult.problemsSolved,
      opponentProblemsSolved: opponentResult?.problemsSolved || 0,
      ratingChange: playerResult.ratingChange,
      ratingAfter: playerResult.ratingAfter,
      duration: match.duration,
      matchType: match.type
    });
  }
}

// ============== LEADERBOARD ==============

export async function getGlobalLeaderboard(limit = 100, sortBy = 'rating') {
  if (isMongoConnected()) {
    let sortField = '-currentRating';
    if (sortBy === 'wins') sortField = '-totalWins';
    else if (sortBy === 'winrate') sortField = '-winRate';
    else if (sortBy === 'streak') sortField = '-currentStreak';
    
    const stats = await PlayerStatistics.find({})
      .sort(sortField)
      .limit(limit)
      .populate('userId', 'username avatar color');
    
    return stats.map((s, i) => ({
      rank: i + 1,
      userId: s.userId?._id,
      username: s.userId?.username || s.username,
      avatar: s.userId?.avatar,
      color: s.userId?.color,
      rating: s.currentRating,
      wins: s.totalWins,
      losses: s.totalLosses,
      winRate: s.winRate,
      streak: s.currentStreak
    }));
  } else {
    return inMemoryStore.getLeaderboard(limit, sortBy);
  }
}

export async function getUserRank(userId) {
  if (isMongoConnected()) {
    const stats = await PlayerStatistics.findOne({ userId });
    if (!stats) return null;
    
    const higherCount = await PlayerStatistics.countDocuments({
      currentRating: { $gt: stats.currentRating }
    });
    
    return higherCount + 1;
  } else {
    const leaderboard = inMemoryStore.getLeaderboard(1000);
    const index = leaderboard.findIndex(p => p.userId === userId);
    return index === -1 ? null : index + 1;
  }
}

// ============== USER HISTORY ==============

export async function getUserMatchHistory(userId, limit = 50) {
  if (isMongoConnected()) {
    return await MatchHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  } else {
    const history = inMemoryStore.getUserHistory(userId);
    return history.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }
}

export default {
  calculateRatingChange,
  updatePlayerStatsAfterMatch,
  addMatchHistory,
  getGlobalLeaderboard,
  getUserRank,
  getUserMatchHistory
};
