import mongoose from 'mongoose';
import Match from '../models/Match.js';
import Room from '../models/Room.js';
import CodingProblem from '../models/CodingProblem.js';
import User from '../models/User.js';
import { updatePlayerStatsAfterMatch, addMatchHistory } from './scoringService.js';
import { getUserById } from './authService.js';
import { SCORING } from '../config/scoring.js';

async function buildPlayerEntry(userId, status = 'WAITING') {
  const user = await getUserById(userId);
  return {
    userId: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
    username: user?.username || 'Player',
    avatar: user?.avatar || 'PL',
    ratingBefore: user?.rating || SCORING.defaultRating,
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

  const questionCount = [1, 2, 3].includes(parseInt(options.questionCount, 10))
    ? parseInt(options.questionCount, 10)
    : 1;

  let duration = options.duration || 600;
  if ([5, 10, 15].includes(duration)) {
    duration = duration * 60;
  }
  if (![300, 600, 900].includes(duration)) {
    duration = 600;
  }
  const difficulty = options.difficulty || 'Medium';

  let problems = options.problemIds;
  if (!problems || problems.length === 0) {
    problems = await getRandomProblems(questionCount, difficulty);
  }

  const match = new Match({
    roomCode,
    type,
    status: 'WAITING',
    isPrivate: type === 'private' || type === 'scrimmage',
    questionCount,
    duration,
    timeLimit: `${duration / 60 < 10 ? '0' : ''}${duration / 60}:00`,
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

export function determineWinnerAndPoints(player1, player2) {
  const p1Solved = player1.problemsSolved || 0;
  const p2Solved = player2.problemsSolved || 0;
  const p1Time = player1.completionTime || player1.totalTime || 0;
  const p2Time = player2.completionTime || player2.totalTime || 0;

  let winner = null;
  let winnerId = null;
  let isDraw = false;
  let result = 'draw';
  let rating1Change = 0;
  let rating2Change = 0;

  // Rule 1 — Number of problems solved: Player who solved more problems wins
  if (p1Solved > p2Solved) {
    winner = player1.userId;
    winnerId = player1.userId;
    result = 'player1';
    rating1Change = SCORING.ranked.win;
    rating2Change = SCORING.ranked.loss;
  } else if (p2Solved > p1Solved) {
    winner = player2.userId;
    winnerId = player2.userId;
    result = 'player2';
    rating1Change = SCORING.ranked.loss;
    rating2Change = SCORING.ranked.win;
  } else if (p1Solved > 0 && p2Solved > 0) {
    // Rule 2 — Completion time: If both players solved the same number of problems > 0
    if (p1Time < p2Time) {
      winner = player1.userId;
      winnerId = player1.userId;
      result = 'player1';
      rating1Change = SCORING.ranked.win;
      rating2Change = SCORING.ranked.loss;
    } else if (p2Time < p1Time) {
      winner = player2.userId;
      winnerId = player2.userId;
      result = 'player2';
      rating1Change = SCORING.ranked.loss;
      rating2Change = SCORING.ranked.win;
    } else {
      // Rule 4 — Tie: Same solved count and same completion time -> DRAW, 0 points each
      winner = null;
      winnerId = null;
      isDraw = true;
      result = 'draw';
      rating1Change = SCORING.ranked.draw;
      rating2Change = SCORING.ranked.draw;
    }
  } else {
    // Rule 3 — Neither player solved anything: Both solved 0 -> DRAW, 0 points each
    winner = null;
    winnerId = null;
    isDraw = true;
    result = 'draw';
    rating1Change = SCORING.ranked.draw;
    rating2Change = SCORING.ranked.draw;
  }

  return {
    winner,
    winnerId,
    isDraw,
    result,
    rating1Change,
    rating2Change
  };
}

export async function getMatchById(matchId) {
  let match = null;
  if (mongoose.Types.ObjectId.isValid(matchId)) {
    match = await Match.findById(matchId).populate('problems');
  }
  if (!match && matchId) {
    const clean = String(matchId).replace(/^(room_|match_)/i, '').toUpperCase();
    match = await Match.findOne({ roomCode: clean }).populate('problems');
    if (!match) {
      const room = await Room.findOne({ code: clean });
      if (room?.matchId) {
        match = await Match.findById(room.matchId).populate('problems');
      }
    }
  }

  // Authoritative backend auto-finalization if match duration has expired or all players solved
  if (match && match.status === 'ACTIVE') {
    const now = Date.now();
    const started = new Date(match.startedAt || match.createdAt || 0).getTime();
    const ageSeconds = Math.floor((now - started) / 1000);
    const durationSeconds = match.duration || 900;

    const isTimeExpired = started > 0 && ageSeconds >= durationSeconds;
    const reqCount = match.problems?.length || match.questionCount || 1;
    const isRanked = match.type === 'ranked';

    let shouldComplete = isTimeExpired;
    if (!shouldComplete) {
      if (isRanked) {
        shouldComplete = match.players.some((p) => (p.problemsSolved || 0) >= reqCount);
      } else {
        shouldComplete = match.players.length >= 2 && match.players.every((p) => (p.problemsSolved || 0) >= reqCount);
      }
    }

    if (shouldComplete) {
      match = await completeMatch(match._id);
    }
  }

  return match;
}

export async function getMatchByRoomCode(code) {
  return await getMatchById(code);
}

export async function completeMatch(matchId) {
  let match = null;
  if (matchId) {
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      match = await Match.findById(matchId).populate('problems');
    }
    if (!match) {
      const clean = String(matchId).replace(/^(room_|match_)/i, '').toUpperCase();
      match = await Match.findOne({ roomCode: clean }).populate('problems');
      if (!match) {
        const room = await Room.findOne({ code: clean });
        if (room?.matchId) {
          match = await Match.findById(room.matchId).populate('problems');
        }
      }
    }
  }

  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    throw err;
  }

  // Idempotency: If already completed or abandoned with rewards processed, return current state
  if (match.status === 'COMPLETED' || (match.status === 'ABANDONED' && match.rewardsAwarded)) {
    return match;
  }

  // Ensure 2 players exist in match (fills adversary if 1v1 practice)
  if (match.players.length === 1) {
    const opponent = {
      userId: null,
      username: match.opponent || 'v0_Sniper',
      avatar: match.opponentAvatar || 'VS',
      ratingBefore: match.opponentRating || SCORING.simulated.ranked,
      problemsSolved: 0,
      completionTime: 0,
      totalTime: 0,
      status: 'FINISHED'
    };
    match.players.push(opponent);
  }

  if (match.players.length < 2) {
    const err = new Error('Match must have 2 players to complete');
    err.statusCode = 400;
    throw err;
  }

  const [player1, player2] = match.players;

  player1.problemsSolved = player1.problemsSolved || 0;
  player2.problemsSolved = player2.problemsSolved || 0;
  player1.completionTime = player1.problemsSolved > 0 ? (player1.completionTime || player1.totalTime || 0) : null;
  player2.completionTime = player2.problemsSolved > 0 ? (player2.completionTime || player2.totalTime || 0) : null;
  player1.totalTime = player1.completionTime || 0;
  player2.totalTime = player2.completionTime || 0;

  const outcome = determineWinnerAndPoints(player1, player2);

  const rating1Before = player1.ratingBefore || SCORING.defaultRating;
  const rating2Before = player2.ratingBefore || SCORING.defaultRating;

  player1.ratingChange = outcome.rating1Change;
  player2.ratingChange = outcome.rating2Change;
  player1.pointsAwarded = outcome.rating1Change;
  player2.pointsAwarded = outcome.rating2Change;
  player1.ratingAfter = Math.max(0, rating1Before + outcome.rating1Change);
  player2.ratingAfter = Math.max(0, rating2Before + outcome.rating2Change);
  player1.isWinner = outcome.result === 'player1';
  player2.isWinner = outcome.result === 'player2';
  player1.status = 'FINISHED';
  player2.status = 'FINISHED';

  match.status = 'COMPLETED';
  match.winner = outcome.winner;
  match.winnerId = outcome.winnerId;
  match.isDraw = outcome.isDraw;
  match.result = outcome.result;
  match.completedAt = new Date();
  if (!match.duration) {
    match.duration = match.startedAt
      ? Math.max(1, Math.floor((match.completedAt - match.startedAt) / 1000))
      : 600;
  }

  if (!match.rewardsAwarded) {
    match.rewardsAwarded = true;
    match.rewardDetails = {
      winnerId: outcome.winnerId,
      isDraw: outcome.isDraw,
      awardedAt: new Date(),
      ratingChanges: {
        [player1.userId || player1.username]: outcome.rating1Change,
        [player2.userId || player2.username]: outcome.rating2Change
      }
    };

    // Update MongoDB for player 1 (if registered user)
    if (player1.userId && mongoose.Types.ObjectId.isValid(player1.userId)) {
      await updatePlayerStatsAfterMatch(player1.userId, match, player1);
      await addMatchHistory(player1.userId, match, player1, player2);
    }

    // Update MongoDB for player 2 (if registered user)
    if (player2.userId && mongoose.Types.ObjectId.isValid(player2.userId)) {
      await updatePlayerStatsAfterMatch(player2.userId, match, player2);
      await addMatchHistory(player2.userId, match, player2, player1);
    }
  }

  await match.save();

  if (match.roomCode) {
    await Room.updateOne({ code: match.roomCode }, { $set: { status: 'completed' } }).catch(() => null);
  }

  return match;
}

/**
 * Handle match abandonment when a player leaves midway.
 * Fully idempotent: awards rewards to remaining player exactly once.
 */
export async function abandonMatch(matchId, leavingUserId, extra = {}) {
  let match = null;

  // Deliberately fetch WITHOUT the auto-complete path (getMatchById). Auto
  // completing inside an abandonment call would award standard duel deltas
  // (+/- win/loss) to the remaining player instead of the abandonment reward.
  // The atomic claim below keeps awarding authoritative and idempotent.
  if (matchId && mongoose.Types.ObjectId.isValid(matchId)) {
    match = await Match.findById(matchId);
  }
  if (!match && matchId) {
    const clean = String(matchId).replace(/^(room_|match_)/i, '').toUpperCase();
    match = await Match.findOne({ roomCode: clean });
    if (!match) {
      const room = await Room.findOne({ code: clean });
      if (room?.matchId) {
        match = await Match.findById(room.matchId);
      }
    }
  }

  // If match was not pre-created in MongoDB (e.g. ad-hoc ranked duel), create Match document now
  if (!match) {
    const cleanCode = String(matchId || `M${Date.now().toString(36)}`)
      .replace(/^(match_|room_)/i, '')
      .slice(0, 10)
      .toUpperCase();

    match = new Match({
      roomCode: cleanCode || `M${Date.now().toString(36).toUpperCase()}`,
      type: 'ranked',
      status: 'ACTIVE',
      startedAt: new Date(Date.now() - 30000), // ~30s ago
      players: []
    });
  }

  if (extra.problemTitle && !match.problemTitle) {
    match.problemTitle = extra.problemTitle;
  }
  if (extra.difficulty && !match.difficulty) {
    match.difficulty = extra.difficulty;
  }

  // If already settled (completed OR abandoned-with-rewards), return state.
  // Never overwrite a completed verdict with abandonment rewards.
  if (match.status === 'COMPLETED' || (match.status === 'ABANDONED' && match.rewardsAwarded)) {
    return match;
  }

  match.status = 'ABANDONED';
  match.completedAt = new Date();
  if (match.startedAt) {
    match.duration = Math.max(1, Math.floor((match.completedAt - match.startedAt) / 1000));
  } else {
    match.duration = match.duration || 30;
  }

  // Identify leaving user
  let leavingUserDoc = null;
  if (leavingUserId && mongoose.Types.ObjectId.isValid(leavingUserId)) {
    leavingUserDoc = await User.findById(leavingUserId);
  } else if (leavingUserId) {
    leavingUserDoc = await User.findOne({ username: leavingUserId });
  }

  const leavingIdStr = leavingUserDoc?._id?.toString() || leavingUserId?.toString();

  // Find or insert leaving player in match
  let leavingPlayer = match.players.find(
    (p) => p.userId && p.userId.toString() === leavingIdStr
  );
  if (!leavingPlayer) {
    leavingPlayer = {
      userId: leavingUserDoc?._id || leavingUserId,
      username: leavingUserDoc?.username || 'Combatant',
      avatar: leavingUserDoc?.avatar || 'KV',
      ratingBefore: leavingUserDoc?.rating || SCORING.defaultRating,
      problemsSolved: 0,
      status: 'DISCONNECTED'
    };
    match.players.push(leavingPlayer);
  }

  match.abandonedBy = leavingPlayer.userId;
  leavingPlayer.status = 'DISCONNECTED';

  // Find or insert remaining player in match
  let remainingPlayer = match.players.find(
    (p) => !p.userId || p.userId.toString() !== leavingIdStr
  );
  if (!remainingPlayer) {
    remainingPlayer = {
      userId: null,
      username: match.opponent || 'v0_Sniper',
      avatar: match.opponentAvatar || 'VS',
      ratingBefore: match.opponentRating || SCORING.simulated.ranked,
      problemsSolved: 1,
      status: 'FINISHED'
    };
    match.players.push(remainingPlayer);
  }

  remainingPlayer.status = 'FINISHED';
  match.winner = remainingPlayer.userId || null;

  // Authoritative rating, rank, and history update.
  // Atomic claim: a client fires abandonRoom + abandonMatch concurrently; only the
  // first request may process rewards, otherwise we'd double-award and write
  // duplicate MatchHistory/stats records.
  const claim = await Match.updateOne(
    { _id: match._id, rewardsAwarded: { $ne: true } },
    {
      $set: {
        status: 'ABANDONED',
        rewardsAwarded: true,
        completedAt: new Date()
      }
    }
  ).catch(() => null);

  if (!claim || claim.modifiedCount === 0) {
    const fresh = await Match.findById(match._id).catch(() => null);
    return fresh || match;
  }

  const { leaverPenalty, remainingReward } = SCORING.abandonment;

  const leavingBefore = leavingUserDoc?.rating || leavingPlayer.ratingBefore || SCORING.defaultRating;
  const leavingAfter = Math.max(0, leavingBefore + leaverPenalty);
  leavingPlayer.ratingChange = leaverPenalty;
  leavingPlayer.ratingAfter = leavingAfter;

  const remainingBefore = remainingPlayer.ratingBefore || SCORING.defaultRating;
  const remainingAfter = remainingBefore + remainingReward;
  remainingPlayer.ratingChange = remainingReward;
  remainingPlayer.ratingAfter = remainingAfter;

  match.rewardsAwarded = true;
  match.rewardDetails = {
    winnerId: remainingPlayer.userId || null,
    abandonedBy: leavingPlayer.userId,
    awardedAt: new Date(),
    rewardedLp: remainingReward,
    penaltyLp: leaverPenalty
  };

    // Update leaving player in MongoDB: User, PlayerStatistics, MatchHistory
  if (leavingUserDoc?._id) {
    await updatePlayerStatsAfterMatch(leavingUserDoc._id, match, leavingPlayer);
    await addMatchHistory(leavingUserDoc._id, match, leavingPlayer, remainingPlayer);
  }

  // If opponent is a real registered user, update them as well
  if (remainingPlayer.userId && mongoose.Types.ObjectId.isValid(remainingPlayer.userId)) {
    await updatePlayerStatsAfterMatch(remainingPlayer.userId, match, remainingPlayer);
    await addMatchHistory(remainingPlayer.userId, match, remainingPlayer, leavingPlayer);
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
