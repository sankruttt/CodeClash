import 'dotenv/config';
import mongoose from 'mongoose';
import assert from 'assert';

import Match from '../models/Match.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import MatchHistory from '../models/MatchHistory.js';
import CodingProblem from '../models/CodingProblem.js';
import BountyAttempt from '../models/BountyAttempt.js';

import {
  completeMatch,
  getMatchById,
  abandonMatch
} from '../services/matchService.js';
import { finalizeBounty } from '../services/bountyService.js';
import {
  getGlobalLeaderboard,
  getUserMatchHistory,
  buildLeaderboardCacheKey
} from '../services/scoringService.js';
import {
  cacheGet,
  invalidLeaderboardCache,
  invalidMatchHistoryCache,
  cacheBackendName
} from '../services/cacheService.js';
import { SCORING } from '../config/scoring.js';

let passed = 0;
let failed = 0;

function logTest(testNumber, name, condition, details = '') {
  if (condition) {
    console.log(`✓ Test ${testNumber}: ${name}`);
    passed++;
  } else {
    console.error(`✗ Test ${testNumber}: ${name} - FAILED. ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- CACHE INVALIDATION & LEADERBOARD/HISTORY REFRESH TESTS ---');
  console.log(`Cache backend under test: ${cacheBackendName()}`);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codeclash');

  const u1Suffix = Date.now().toString(36);
  const userA = await User.create({
    username: `cache_a_${u1Suffix}`,
    email: `cache_a_${u1Suffix}@codeclash.io`,
    password: 'password123',
    rating: 1500,
    wins: 0,
    losses: 0,
    draws: 0
  });
  const userB = await User.create({
    username: `cache_b_${u1Suffix}`,
    email: `cache_b_${u1Suffix}@codeclash.io`,
    password: 'password123',
    rating: 1500,
    wins: 0,
    losses: 0,
    draws: 0
  });

  const problem = await CodingProblem.findOne({ isActive: true });
  assert(problem, 'CodingProblem must exist in MongoDB');

  const lbSearch = userA.username;
  const lbCacheKey = buildLeaderboardCacheKey({ page: 1, limit: 20, sortBy: 'rating', stack: 'Python', search: lbSearch });
  const lbOpts = { page: 1, limit: 20, sortBy: 'rating', stack: 'Python', search: lbSearch };
  const hisKeyA = `match-history:${userA._id}`;
  const hisKeyB = `match-history:${userB._id}`;

  try {
    // ============================================================
    // Setup: prime the caches before any match is played
    // ============================================================
    await invalidLeaderboardCache();
    await invalidMatchHistoryCache(userA._id);
    await invalidMatchHistoryCache(userB._id);

    const beforeLb = await getGlobalLeaderboard(lbOpts);
    assert(beforeLb.leaderboard.length >= 0, 'Leaderboard loads');
    await getUserMatchHistory(userA._id, 50);
    await getUserMatchHistory(userB._id, 50);

    const cachedLb = await cacheGet(lbCacheKey);
    const cachedHisA = await cacheGet(hisKeyA);
    const cachedHisB = await cacheGet(hisKeyB);

    logTest(
      1,
      'Leaderboard & match-history caches are populated after reads',
      !!cachedLb && !!cachedHisA && !!cachedHisB
    );

    // ============================================================
    // Scenario A: Ranked win via completeMatch invalidates caches
    // ============================================================
    const ratingAWinBefore = (await User.findById(userA._id)).rating;

    const winMatch = await Match.create({
      roomCode: `CW_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 600,
      startedAt: new Date(Date.now() - 300000),
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: ratingAWinBefore,
          problemsSolved: 1,
          completionTime: 180,
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: 1500,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        }
      ]
    });

    const finished = await completeMatch(winMatch._id);
    const winnerAfter = (await User.findById(userA._id)).rating;
    const loserAfter = (await User.findById(userB._id)).rating;

    logTest(
      2,
      'completeMatch persists authoritative ratings (A +24, B -18)',
      finished.status === 'COMPLETED' &&
      String(finished.winnerId) === String(userA._id) &&
      winnerAfter === ratingAWinBefore + SCORING.ranked.win &&
      loserAfter === 1500 + SCORING.ranked.loss
    );

    const cachedLbAfterWin = await cacheGet(lbCacheKey);
    const cachedHisAAfterWin = await cacheGet(hisKeyA);
    const cachedHisBAfterWin = await cacheGet(hisKeyB);

    logTest(
      3,
      'completeMatch invalidates leaderboard + both players\' history caches',
      cachedLbAfterWin === null && cachedHisAAfterWin === null && cachedHisBAfterWin === null
    );

    // The next leaderboard read should be fresh from MongoDB (no stale cache).
    const freshLb = await getGlobalLeaderboard(lbOpts);
    const aInLb = freshLb.leaderboard.find((it) => String(it.userId) === String(userA._id));
    const cachedLbAfterRefresh = await cacheGet(lbCacheKey);

    logTest(
      4,
      'Leaderboard re-populated after re-read with updated winner rating',
      !!cachedLbAfterRefresh && !!aInLb && aInLb.rating === winnerAfter
    );

    // ============================================================
    // Scenario B: Timeout auto-finalize (draw, 0 LP) invalidates caches
    // ============================================================
    await getGlobalLeaderboard(lbOpts); // re-prime
    await getUserMatchHistory(userA._id, 50);

    const timeoutMatch = await Match.create({
      roomCode: `CT_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 300,
      startedAt: new Date(Date.now() - 310000), // expired
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: (await User.findById(userA._id)).rating,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: (await User.findById(userB._id)).rating,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        }
      ]
    });

    const autoFetched = await getMatchById(timeoutMatch._id);
    const cachedLbAfterTimeout = await cacheGet(lbCacheKey);
    const cachedHisAAfterTimeout = await cacheGet(hisKeyA);

    logTest(
      5,
      'Timeout auto-finalize (getMatchById) invalidates caches',
      autoFetched.status === 'COMPLETED' &&
      cachedLbAfterTimeout === null &&
      cachedHisAAfterTimeout === null
    );

    // ============================================================
    // Scenario C: AbandonMatch (leaver penalty + survivor reward)
    // ============================================================
    const ratingA = (await User.findById(userA._id)).rating;
    const ratingB = (await User.findById(userB._id)).rating;
    await getGlobalLeaderboard(lbOpts);
    await getUserMatchHistory(userA._id, 50);
    await getUserMatchHistory(userB._id, 50);

    const abandonMatchDoc = await Match.create({
      roomCode: `CA_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 600,
      startedAt: new Date(Date.now() - 60000),
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: ratingA,
          problemsSolved: 0,
          status: 'ACTIVE'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: ratingB,
          problemsSolved: 0,
          status: 'ACTIVE'
        }
      ]
    });

    const abandoned = await abandonMatch(abandonMatchDoc._id, userB._id);
    const survivorAfter = (await User.findById(userA._id)).rating;
    const leaverAfter = (await User.findById(userB._id)).rating;

    const cachedLbAfterAbandon = await cacheGet(lbCacheKey);
    const cachedHisAAfterAbandon = await cacheGet(hisKeyA);
    const cachedHisBAfterAbandon = await cacheGet(hisKeyB);

    logTest(
      6,
      'abandonMatch persists penalty/reward and invalidates both caches',
      abandoned.status === 'ABANDONED' &&
      survivorAfter === ratingA + SCORING.abandonment.remainingReward &&
      leaverAfter === ratingB + SCORING.abandonment.leaverPenalty &&
      cachedLbAfterAbandon === null &&
      cachedHisAAfterAbandon === null &&
      cachedHisBAfterAbandon === null
    );

    // ============================================================
    // Scenario D: Bounty finalize (+SCORING.bounty.solve) invalidates caches
    // ============================================================
    const ratingSolo = (await User.findById(userA._id)).rating;
    await getGlobalLeaderboard(lbOpts);
    await getUserMatchHistory(userA._id, 50);

    const bountyMatch = await Match.create({
      roomCode: `CB_${u1Suffix}`.toUpperCase(),
      type: 'bounty',
      status: 'ACTIVE',
      duration: 600,
      startedAt: new Date(Date.now() - 300000),
      questionCount: 1,
      difficulty: problem.difficulty || 'Medium',
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: ratingSolo,
          problemsSolved: 1,
          status: 'FINISHED'
        }
      ]
    });

    await BountyAttempt.create({
      userId: userA._id,
      day: new Date().toISOString().slice(0, 10),
      problemId: problem._id,
      matchId: bountyMatch._id,
      status: 'IN_PROGRESS',
      reward: 0
    });

    const settledBounty = await finalizeBounty(bountyMatch._id, userA._id);
    const bountyRatingAfter = (await User.findById(userA._id)).rating;

    const cachedLbAfterBounty = await cacheGet(lbCacheKey);
    const cachedHisAAfterBounty = await cacheGet(hisKeyA);

    logTest(
      7,
      'finalizeBounty persists bounty LP and invalidates caches',
      settledBounty.settled === true &&
      bountyRatingAfter === ratingSolo + SCORING.bounty.solve &&
      cachedLbAfterBounty === null &&
      cachedHisAAfterBounty === null
    );

    // ============================================================
    // Scenario E: MatchHistory is actually refreshed from DB post-win
    // ============================================================
    await invalidLeaderboardCache();
    await invalidMatchHistoryCache(userA._id);

    const latestHistory = await getUserMatchHistory(userA._id, 100);
    const winEntry = latestHistory.find((h) => String(h.matchId) === String(winMatch._id));

    logTest(
      8,
      'Post-win history refresh surfaces the new backend record',
      Array.isArray(latestHistory) && !!winEntry && winEntry.result === 'win' &&
      winEntry.ratingChange === SCORING.ranked.win
    );
  } finally {
    // Cleanup all artifacts created by this test
    await BountyAttempt.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await MatchHistory.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await PlayerStatistics.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await Match.deleteMany({ roomCode: { $regex: `^(CW|CT|CA|CB)_${u1Suffix}` } });
    await Room.deleteMany({ code: { $regex: `^(CW|CT|CA|CB)_${u1Suffix}` } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await invalidLeaderboardCache();
    await Promise.all([invalidMatchHistoryCache(userA._id), invalidMatchHistoryCache(userB._id)]);
    await mongoose.disconnect();
  }

  console.log(`\n--- Summary: Passed: ${passed} | Failed: ${failed} ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();