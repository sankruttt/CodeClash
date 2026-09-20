import mongoose from 'mongoose';
import Match from '../models/Match.js';
import User from '../models/User.js';
import CodingProblem from '../models/CodingProblem.js';
import BountyAttempt from '../models/BountyAttempt.js';
import { SCORING } from '../config/scoring.js';
import { addMatchHistory } from './scoringService.js';
import { invalidMatchHistoryCache, invalidLeaderboardCache } from './cacheService.js';
import { recordUserActivity } from './streakService.js';
import { getUserById } from './authService.js';

const BOUNTY_DURATION_SECONDS = SCORING.bounty.durationMinutes * 60;
const BOUNTY_SOLVE_REWARD = SCORING.bounty.solve;

// Deterministic UTC calendar day key: 'YYYY-MM-DD'.
// New bounty day rolls over at 00:00 UTC.
export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function buildRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BNY-${code}`;
}

async function pickBountyProblem(userId) {
  const usedProblemIds = await BountyAttempt.distinct('problemId', { userId });
  const used = (usedProblemIds || [])
    .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  const baseMatch = { isActive: true };
  if (used.length > 0) {
    baseMatch._id = { $nin: used };
  }

  let pool = await CodingProblem.aggregate([
    { $match: baseMatch },
    { $sample: { size: 1 } }
  ]);

  // Fallback: every active problem has already been used — allow repeats.
  if (!pool || pool.length === 0) {
    pool = await CodingProblem.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 1 } }
    ]);
  }

  return pool[0] || null;
}

// ============== STATUS ==============

export async function getBountyStatus(userId) {
  const day = dayKey();
  const attempt = await BountyAttempt.findOne({ userId, day });

  let problem = null;
  let match = null;
  let inProgress = false;
  let locked = false;

  if (attempt) {
    if (attempt.status === 'IN_PROGRESS') {
      inProgress = true;
      const rawProblem = await findProblemById(attempt.problemId);
      problem = normalizeProblem(rawProblem);
      match = await Match.findById(attempt.matchId);
    } else {
      locked = true;
    }
  }

  return {
    day,
    available: !attempt,
    inProgress,
    locked,
    attempt: attempt || null,
    problem,
    matchId: attempt?.matchId ? String(attempt.matchId) : null,
    match: match || null,
    solved: attempt?.solved || false,
    reward: attempt?.reward || 0,
    rewardLp: BOUNTY_SOLVE_REWARD,
    durationSeconds: BOUNTY_DURATION_SECONDS,
    durationMinutes: SCORING.bounty.durationMinutes
  };
}

async function findProblemById(id) {
  if (!id) return null;
  try {
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      return await CodingProblem.findById(id);
    }
  } catch {
    // fall through
  }
  return null;
}

function normalizeProblem(problem) {
  if (!problem) return null;
  const obj = problem.toObject ? problem.toObject() : problem;
  return { ...obj, id: String(obj._id || obj.id) };
}

// ============== START / RESUME ==============

export async function startBounty(userId) {
  const day = dayKey();

  const existing = await BountyAttempt.findOne({ userId, day });

  // Already settled today -> locked until the next day.
  if (existing && existing.status !== 'IN_PROGRESS') {
    const err = new Error('You have already attempted today\'s bounty. A new bounty unlocks tomorrow.');
    err.statusCode = 409;
    err.code = 'BOUNTY_ALREADY_ATTEMPTED';
    throw err;
  }

  // Resume an in-progress attempt (e.g. page reload mid-arena).
  if (existing) {
    const match = await Match.findById(existing.matchId);
    const problem = await findProblemById(existing.problemId);
    return {
      resumed: true,
      attempt: existing,
      match,
      problem: normalizeProblem(problem)
    };
  }

  // Fresh daily attempt: pick a problem different from any previously used.
  const problem = await pickBountyProblem(userId);
  if (!problem) {
    const err = new Error('No active problems are available for the bounty right now.');
    err.statusCode = 503;
    err.code = 'BOUNTY_UNAVAILABLE';
    throw err;
  }

  const userDoc = await getUserById(userId);
  const now = new Date();

  const match = new Match({
    roomCode: buildRoomCode(),
    type: 'bounty',
    status: 'ACTIVE',
    isPrivate: false,
    questionCount: 1,
    difficulty: problem.difficulty || 'Medium',
    duration: BOUNTY_DURATION_SECONDS,
    timeLimit: `${SCORING.bounty.durationMinutes < 10 ? '0' : ''}${SCORING.bounty.durationMinutes}:00`,
    players: [
      {
        userId: userDoc?._id || userId,
        username: userDoc?.username || 'Combatant',
        avatar: userDoc?.avatar || 'PL',
        ratingBefore: userDoc?.rating || SCORING.defaultRating,
        totalTime: 0,
        problemsSolved: 0,
        submissions: 0,
        status: 'ACTIVE',
        problemResults: []
      }
    ],
    problems: [problem._id],
    startedAt: now
  });
  await match.save();

  let attempt;
  try {
    attempt = await BountyAttempt.create({
      userId,
      day,
      problemId: problem._id,
      matchId: match._id,
      status: 'IN_PROGRESS',
      startedAt: now
    });
  } catch (err) {
    // Unique (userId, day) collision — a concurrent start already won the day.
    if (err && err.code === 11000) {
      await Match.deleteOne({ _id: match._id }).catch(() => null);
      const winner = await BountyAttempt.findOne({ userId, day });
      const winnerMatch = await Match.findById(winner?.matchId);
      const winnerProblem = await findProblemById(winner?.problemId);
      return {
        resumed: true,
        attempt: winner,
        match: winnerMatch,
        problem: normalizeProblem(winnerProblem)
      };
    }
    throw err;
  }

  await match.populate('problems');
  return { resumed: false, attempt, match, problem: normalizeProblem(problem) };
}

// ============== FINALIZE (SOLVED / DNF / ABANDONED) ==============
// Settles a bounty attempt authoritatively. Idempotent: only the first caller
// may claim the settlement; everyone else gets the already-settled state.
// Reward rules: solved -> +SCORING.bounty.solve LP, else -> 0 LP (never a
// ranked penalty, never a dual reward).

export async function finalizeBounty(matchId, userId) {
  let match = null;
  if (matchId && mongoose.Types.ObjectId.isValid(String(matchId))) {
    match = await Match.findById(matchId);
  }
  if (!match) {
    const clean = String(matchId || '').replace(/^(match_|room_|bny-)/i, '').toUpperCase();
    match = await Match.findOne({ roomCode: clean });
  }
  if (!match) return null;

  const attempt = await BountyAttempt.findOne({ matchId: match._id });
  if (!attempt) return { match, attempt: null, settled: false };

  const uid = userId || attempt.userId;
  const player = match.players.find(
    (p) => p.userId && String(p.userId) === String(uid)
  );

  if (!player) {
    // Nobody associated with this match — nothing to award, just mark settled.
    await markSettled(attempt, match, { solved: false, reward: 0 });
    return { match: await Match.findById(match._id), attempt: await BountyAttempt.findById(attempt._id), settled: true };
  }

  const solved = (player.problemsSolved || 0) >= 1;
  const reward = solved ? BOUNTY_SOLVE_REWARD : SCORING.bounty.dnf;

  return await settle(attempt, uid, matchedPlayer(player), match, solved, reward);
}

async function settle(attempt, uid, playerEntry, match, solved, reward) {
  // Atomic claim so concurrent finalize/complete/abandon calls settle exactly once.
  const claim = await BountyAttempt.updateOne(
    { _id: attempt._id, status: 'IN_PROGRESS' },
    {
      $set: {
        status: 'COMPLETED',
        solved,
        reward,
        completedAt: new Date()
      }
    }
  );

  if (!claim || claim.modifiedCount === 0) {
    // Already settled — return the settled state without double-awarding.
    const settledAttempt = await BountyAttempt.findById(attempt._id);
    const settledMatch = await Match.findById(match._id).populate('problems');
    return { match: settledMatch, attempt: settledAttempt, settled: true };
  }

  const userDoc = await getUserById(uid);
  const ratingBefore = userDoc?.rating ?? playerEntry.ratingBefore ?? SCORING.defaultRating;
  const ratingAfter = Math.max(0, ratingBefore + reward);

  playerEntry.status = 'FINISHED';
  playerEntry.ratingChange = reward;
  playerEntry.pointsAwarded = reward;
  playerEntry.ratingAfter = ratingAfter;
  playerEntry.isWinner = solved;

  // Keep the matches list meaningful for history: add a neutral solo slot when
  // no adversary exists.
  if (match.players.length === 1) {
    match.players.push({
      userId: null,
      username: match.opponent || 'Quantum Bounty',
      avatar: match.opponentAvatar || 'QB',
      ratingBefore: null,
      ratingAfter: null,
      ratingChange: 0,
      problemsSolved: 0,
      submission: 0,
      status: 'FINISHED',
      problemResults: []
    });
  }

  match.status = 'COMPLETED';
  match.completedAt = new Date();
  match.winner = solved ? playerEntry.userId : null;
  match.winnerId = solved ? playerEntry.userId : null;
  match.isDraw = !solved;
  match.result = solved ? 'player1' : 'draw';
  if (!match.duration) {
    match.duration = match.startedAt
      ? Math.max(1, Math.floor((match.completedAt - match.startedAt) / 1000))
      : BOUNTY_DURATION_SECONDS;
  }
  match.rewardsAwarded = true;
  match.rewardDetails = {
    bounty: true,
    solved,
    rewardedLp: reward,
    awardedAt: new Date()
  };

  await match.save();

  // Authoritative LP + rank update (bounty LP is pure gain; never touches W/L/D).
  await updateUserRatingAndRank(uid, ratingAfter);

  // Streak credit: a completed bounty counts as daily activity.
  await recordUserActivity(uid, new Date()).catch(() => null);

  // Match history entry so the bounty shows up in Recent Duel History.
  const opponentEntry = match.players[match.players.length - 1];
  await addMatchHistory(
    uid,
    match,
    match.players.find((p) => p.userId && String(p.userId) === String(uid)),
    opponentEntry
  ).catch((err) => console.warn('Bounty history write failed:', err.message));

  // Only invalidate AFTER the bounty LP + history are fully persisted.
  await invalidLeaderboardCache().catch(() => null);
  await invalidMatchHistoryCache(uid).catch(() => null);

  return {
    match: await Match.findById(match._id).populate('problems'),
    attempt: await BountyAttempt.findById(attempt._id),
    settled: true,
    solved,
    reward
  };
}

async function markSettled(attempt, match, { solved, reward }) {
  await BountyAttempt.updateOne(
    { _id: attempt._id, status: 'IN_PROGRESS' },
    { $set: { status: 'COMPLETED', solved, reward, completedAt: new Date() } }
  );
  match.status = 'COMPLETED';
  match.completedAt = new Date();
  match.rewardsAwarded = true;
  match.rewardDetails = { bounty: true, solved, rewardedLp: reward, awardedAt: new Date() };
  await match.save().catch(() => null);
}

async function updateUserRatingAndRank(uid, ratingAfter) {
  if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return;
  await User.findByIdAndUpdate(uid, { rating: ratingAfter });
  const higherCount = await User.countDocuments({
    isActive: { $ne: false },
    rating: { $gt: ratingAfter }
  });
  await User.findByIdAndUpdate(uid, { rank: higherCount + 1 });
}

// normalize a subdocument player before handing to history helpers
function matchedPlayer(player) {
  return player;
}

export default {
  dayKey,
  getBountyStatus,
  startBounty,
  finalizeBounty
};