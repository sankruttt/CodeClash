import mongoose from 'mongoose';
import Match from '../models/Match.js';
import CodingProblem from '../models/CodingProblem.js';
import User from '../models/User.js';
import { calculateRatingChange, updatePlayerStatsAfterMatch, addMatchHistory } from './scoringService.js';
import { getUserById } from './authService.js';

async function buildPlayerEntry(userId, status = 'WAITING') {
  const user = await getUserById(userId);
  return {
    userId: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
    username: user?.username || 'Player',
    avatar: user?.avatar || 'PL',
    ratingBefore: user?.rating || 1500,
    totalTime: 0,
    problemsSolved: 0,
    submissions: 0,
    status,
    problemResults: []
  };
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getRandomProblems(count = 1, difficulty = null) {
  const matchStage = { isActive: true };
  if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    matchStage.difficulty = difficulty;
  }

  const problems = await CodingProblem.aggregate([
    { $match: matchStage },
    { $sample: { size: count } }
  ]);
  return problems.map((p) => p._id);
}

export async function createPrivateMatch(hostId, type = 'private', options = {}) {
  let roomCode;
  let attempts = 0;
  const maxAttempts = 50;
  do {
    roomCode = generateRoomCode();
    attempts++;
  } while ((await Match.findOne({ roomCode })) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    const err = new Error('Failed to generate unique room code');
    err.statusCode = 500;
    err.code = 'ROOM_CODE_GENERATION_FAILED';
    throw err;
  }

  const duration = options.duration || 15 * 60; // seconds
  const difficulty = options.difficulty || 'Medium';

  let problems = options.problemIds;
  if (!problems || problems.length === 0) {
    problems = await getRandomProblems(1, difficulty);
  }

  const match = new Match({
    roomCode,
    type,
    status: 'WAITING',
    isPrivate: type === 'private',
    duration,
    players: [await buildPlayerEntry(hostId)],
    problems
  });

  await match.save();
  return match;
}

export async function joinMatch(roomCode, userId) {
  const match = await Match.findOne({ roomCode: roomCode.toUpperCase() });

  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    err.code = 'MATCH_NOT_FOUND';
    throw err;
  }

  if (match.status !== 'WAITING') {
    const err = new Error('Match is no longer accepting players');
    err.statusCode = 409;
    err.code = 'MATCH_UNAVAILABLE';
    throw err;
  }

  // Check if already in match
  if (match.players.some((p) => p.userId && p.userId.toString() === userId.toString())) {
    const err = new Error('Already in this match');
    err.statusCode = 409;
    err.code = 'ALREADY_IN_MATCH';
    throw err;
  }

  if (match.players.length >= 2) {
    const err = new Error('Match is full');
    err.statusCode = 409;
    err.code = 'MATCH_FULL';
    throw err;
  }

  match.players.push(await buildPlayerEntry(userId));
  match.status = 'MATCHED';

  await match.save();
  return match;
}

export async function startMatch(matchId) {
  const match = await Match.findById(matchId);

  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    throw err;
  }

  if (match.status !== 'MATCHED' && match.status !== 'WAITING') {
    const err = new Error('Match is not ready to start');
    err.statusCode = 400;
    throw err;
  }

  match.status = 'ACTIVE';
  match.startedAt = new Date();

  await match.save();
  return match;
}

export async function getMatchById(matchId) {
  if (mongoose.Types.ObjectId.isValid(matchId)) {
    return await Match.findById(matchId).populate('problems');
  }
  return await Match.findOne({ roomCode: String(matchId).toUpperCase() }).populate('problems');
}

export async function getMatchByRoomCode(code) {
  return await Match.findOne({ roomCode: code.toUpperCase() }).populate('problems');
}

export async function completeMatch(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    throw err;
  }

  if (match.status === 'COMPLETED' || match.status === 'ABANDONED') return match;

  const [player1, player2] = match.players;
  if (!player1 || !player2) {
    const err = new Error('Match must have 2 players to complete');
    err.statusCode = 400;
    throw err;
  }

  player1.problemsSolved = player1.problemsSolved || 0;
  player2.problemsSolved = player2.problemsSolved || 0;
  player1.totalTime = player1.totalTime || 0;
  player2.totalTime = player2.totalTime || 0;

  let winner = null;
  let result = 'draw';

  if (player1.problemsSolved > player2.problemsSolved) {
    winner = player1.userId;
    result = 'player1';
  } else if (player2.problemsSolved > player1.problemsSolved) {
    winner = player2.userId;
    result = 'player2';
  } else if (player1.totalTime < player2.totalTime) {
    winner = player1.userId;
    result = 'player1';
  } else if (player2.totalTime < player1.totalTime) {
    winner = player2.userId;
    result = 'player2';
  }

  // Calculate rating changes
  const rating1Before = player1.ratingBefore || 1500;
  const rating2Before = player2.ratingBefore || 1500;

  const rating1Change = calculateRatingChange(
    rating1Before,
    rating2Before,
    result === 'player1' ? 1 : result === 'player2' ? 0 : 0.5
  );
  const rating2Change = calculateRatingChange(
    rating2Before,
    rating1Before,
    result === 'player2' ? 1 : result === 'player1' ? 0 : 0.5
  );

  player1.ratingAfter = rating1Before + rating1Change;
  player2.ratingAfter = rating2Before + rating2Change;
  player1.ratingChange = rating1Change;
  player2.ratingChange = rating2Change;
  player1.status = 'FINISHED';
  player2.status = 'FINISHED';

  match.status = 'COMPLETED';
  match.winner = winner;
  match.result = result;
  match.completedAt = new Date();
  match.duration = match.startedAt
    ? Math.floor((match.completedAt - match.startedAt) / 1000)
    : match.duration || 0;

  await match.save();
  return match;
}

/**
 * Handle match abandonment when a player leaves midway.
 * Fully idempotent: awards rewards to remaining player exactly once.
 */
export async function abandonMatch(matchId, leavingUserId) {
  let match = await getMatchById(matchId);
  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    throw err;
  }

  // If already completed or abandoned, return existing state (idempotent)
  if (match.status === 'ABANDONED') {
    return match;
  }

  match.status = 'ABANDONED';
  match.completedAt = new Date();

  // Find abandoning player and remaining opponent
  const leavingPlayer = match.players.find(
    (p) => p.userId && p.userId.toString() === leavingUserId.toString()
  );
  const remainingPlayer = match.players.find(
    (p) => p.userId && p.userId.toString() !== leavingUserId.toString()
  );

  if (leavingPlayer) {
    match.abandonedBy = leavingPlayer.userId;
    leavingPlayer.status = 'DISCONNECTED';
  }

  if (remainingPlayer) {
    match.winner = remainingPlayer.userId;
    remainingPlayer.status = 'FINISHED';
  }

  // Idempotent reward processing
  if (!match.rewardsAwarded && remainingPlayer?.userId) {
    const penalty = 24;
    const reward = 24;

    const remainingBefore = remainingPlayer.ratingBefore || 1500;
    const leavingBefore = leavingPlayer?.ratingBefore || 1500;

    remainingPlayer.ratingChange = reward;
    remainingPlayer.ratingAfter = remainingBefore + reward;

    if (leavingPlayer) {
      leavingPlayer.ratingChange = -penalty;
      leavingPlayer.ratingAfter = Math.max(0, leavingBefore - penalty);
    }

    match.rewardsAwarded = true;
    match.rewardDetails = {
      winnerId: remainingPlayer.userId,
      abandonedBy: leavingPlayer?.userId,
      awardedAt: new Date()
    };

    // Update stats and histories
    await updatePlayerStatsAfterMatch(remainingPlayer.userId, match, remainingPlayer);
    await addMatchHistory(remainingPlayer.userId, match, remainingPlayer, leavingPlayer);

    if (leavingPlayer?.userId) {
      await updatePlayerStatsAfterMatch(leavingPlayer.userId, match, leavingPlayer);
      await addMatchHistory(leavingPlayer.userId, match, leavingPlayer, remainingPlayer);
    }
  }

  await match.save();
  return match;
}

export default {
  getRandomProblems,
  createPrivateMatch,
  joinMatch,
  startMatch,
  getMatchById,
  getMatchByRoomCode,
  completeMatch,
  abandonMatch
};
