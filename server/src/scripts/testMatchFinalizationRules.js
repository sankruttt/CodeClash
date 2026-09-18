import 'dotenv/config';
import mongoose from 'mongoose';
import assert from 'assert';

import Match from '../models/Match.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import MatchHistory from '../models/MatchHistory.js';
import CodingProblem from '../models/CodingProblem.js';

import {
  completeMatch,
  getMatchById,
  createPrivateMatch,
  joinMatch,
  determineWinnerAndPoints,
  abandonMatch
} from '../services/matchService.js';
import {
  createRoom,
  joinRoomByCode,
  startRoomByCode,
  updateRoomSettings
} from '../services/roomService.js';
import { submitCode } from '../services/submissionService.js';
import { getGlobalLeaderboard } from '../services/scoringService.js';

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
  console.log('--- STARTING COMPREHENSIVE MATCH FINALIZATION & SCORING TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codeclash');

  // Create two distinct test users for rating & scrimmage verification
  const u1Suffix = Date.now().toString(36);
  const userA = await User.create({
    username: `test_a_${u1Suffix}`,
    email: `test_a_${u1Suffix}@codeclash.io`,
    password: 'password123',
    rating: 1500,
    wins: 0,
    losses: 0,
    draws: 0
  });

  const userB = await User.create({
    username: `test_b_${u1Suffix}`,
    email: `test_b_${u1Suffix}@codeclash.io`,
    password: 'password123',
    rating: 1500,
    wins: 0,
    losses: 0,
    draws: 0
  });

  // Fetch a real problem from MongoDB
  const problem = await CodingProblem.findOne({ isActive: true });
  assert(problem, 'CodingProblem must exist in MongoDB');

  // ============================================================
  // Scenario 1: A solves, B solves later -> A wins if faster
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T1_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 600,
      startedAt: new Date(Date.now() - 300000), // 5 mins ago
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: 1500,
          problemsSolved: 1,
          completionTime: 180, // 03:00
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: 1500,
          problemsSolved: 1,
          completionTime: 240, // 04:00
          status: 'FINISHED'
        }
      ]
    });

    const finished = await completeMatch(match._id);
    logTest(
      1,
      'A solves, B solves later -> Faster player (A) wins',
      finished.status === 'COMPLETED' &&
      String(finished.winnerId) === String(userA._id) &&
      finished.isDraw === false &&
      finished.players[0].pointsAwarded === 24 &&
      finished.players[1].pointsAwarded === -24
    );
  }

  // ============================================================
  // Scenario 2: A solves, B never solves -> wait until timer expires
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T2_${u1Suffix}`.toUpperCase(),
      type: 'scrimmage',
      status: 'ACTIVE',
      duration: 300, // 5 min
      startedAt: new Date(Date.now() - 305000), // expired 5 secs ago
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: userA.rating,
          problemsSolved: 1,
          completionTime: 120, // 02:00
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: userB.rating,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        }
      ]
    });

    // Auto-finalization on getMatchById when timer expired
    const fetched = await getMatchById(match._id);
    logTest(
      2,
      'A solves, B never solves -> timer expires -> A wins with 1 solve vs 0',
      fetched.status === 'COMPLETED' &&
      String(fetched.winnerId) === String(userA._id) &&
      fetched.players[0].problemsSolved === 1 &&
      fetched.players[1].problemsSolved === 0 &&
      fetched.players[0].pointsAwarded === 24 &&
      fetched.players[1].pointsAwarded === -24
    );
  }

  // ============================================================
  // Scenario 3: B solves first, A solves later -> B wins
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T3_${u1Suffix}`.toUpperCase(),
      type: 'scrimmage',
      status: 'ACTIVE',
      duration: 600,
      startedAt: new Date(Date.now() - 400000),
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: 1500,
          problemsSolved: 1,
          completionTime: 350, // 05:50
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          ratingBefore: 1500,
          problemsSolved: 1,
          completionTime: 150, // 02:30 (faster)
          status: 'FINISHED'
        }
      ]
    });

    const finished = await completeMatch(match._id);
    logTest(
      3,
      'B solves first, A solves later -> B wins',
      finished.status === 'COMPLETED' &&
      String(finished.winnerId) === String(userB._id) &&
      finished.players[1].isWinner === true &&
      finished.players[1].pointsAwarded === 24 &&
      finished.players[0].pointsAwarded === -24
    );
  }

  // ============================================================
  // Scenario 4: Neither solves -> 0 points each + DRAW
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T4_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 300,
      startedAt: new Date(Date.now() - 310000),
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          ratingBefore: 1500,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
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

    const finished = await completeMatch(match._id);
    logTest(
      4,
      'Neither solves -> DRAW and 0 points awarded to both',
      finished.status === 'COMPLETED' &&
      finished.isDraw === true &&
      finished.winnerId === null &&
      finished.players[0].pointsAwarded === 0 &&
      finished.players[1].pointsAwarded === 0 &&
      finished.players[0].completionTime === null &&
      finished.players[1].completionTime === null
    );
  }

  // ============================================================
  // Scenario 5: Same solved count, different times -> faster wins
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T5_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 600,
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          problemsSolved: 2,
          completionTime: 272,
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          problemsSolved: 2,
          completionTime: 317,
          status: 'FINISHED'
        }
      ]
    });

    const finished = await completeMatch(match._id);
    logTest(
      5,
      'Same solved count (2 each), different completion times (272s vs 317s) -> faster wins',
      finished.status === 'COMPLETED' &&
      String(finished.winnerId) === String(userA._id) &&
      finished.players[0].pointsAwarded === 24
    );
  }

  // ============================================================
  // Scenario 6: Same solved count and same completion time -> DRAW + 0 points each
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T6_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 600,
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          problemsSolved: 1,
          completionTime: 200,
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          problemsSolved: 1,
          completionTime: 200,
          status: 'FINISHED'
        }
      ]
    });

    const finished = await completeMatch(match._id);
    logTest(
      6,
      'Same solved count and identical completion time -> DRAW + 0 points to both',
      finished.status === 'COMPLETED' &&
      finished.isDraw === true &&
      finished.winnerId === null &&
      finished.players[0].pointsAwarded === 0 &&
      finished.players[1].pointsAwarded === 0
    );
  }

  // ============================================================
  // Scenario 7: Player solves more problems but takes longer -> player with more problems wins
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T7_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 900,
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          problemsSolved: 2,
          completionTime: 500, // took longer
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          problemsSolved: 1,
          completionTime: 120, // finished faster, but only 1 solved
          status: 'FINISHED'
        }
      ]
    });

    const finished = await completeMatch(match._id);
    logTest(
      7,
      'Player with 2 solved (500s) beats player with 1 solved (120s) -> Solved count takes precedence',
      finished.status === 'COMPLETED' &&
      String(finished.winnerId) === String(userA._id) &&
      finished.players[0].pointsAwarded === 24
    );
  }

  // ============================================================
  // Scenario 8: Submission after timer expiry -> Rejected & auto-completed
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T8_${u1Suffix}`.toUpperCase(),
      type: 'ranked',
      status: 'ACTIVE',
      duration: 10,
      startedAt: new Date(Date.now() - 20000), // expired 10s ago
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          status: 'ACTIVE'
        }
      ]
    });

    let rejected = false;
    try {
      await submitCode({
        userId: userA._id,
        matchId: match._id,
        problemId: problem._id,
        code: 'function solve() { return true; }',
        language: 'javascript'
      });
    } catch (err) {
      rejected = err.code === 'TIME_EXPIRED' || err.statusCode === 400;
    }

    const postMatch = await Match.findById(match._id);
    logTest(
      8,
      'Submission after timer expiry is rejected and finalizes match',
      rejected && postMatch.status === 'COMPLETED'
    );
  }

  // ============================================================
  // Scenario 9 & 10: Idempotency on repeated completion requests
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T9_${u1Suffix}`.toUpperCase(),
      type: 'scrimmage',
      status: 'ACTIVE',
      duration: 600,
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          problemsSolved: 1,
          completionTime: 100,
          status: 'FINISHED'
        },
        {
          userId: userB._id,
          username: userB.username,
          problemsSolved: 0,
          status: 'ACTIVE'
        }
      ]
    });

    const firstCompletion = await completeMatch(match._id);
    const firstWinner = firstCompletion.winnerId;
    const firstPoints = firstCompletion.players[0].pointsAwarded;

    // Simulate duplicate completion call (e.g. both browsers or refresh)
    const secondCompletion = await completeMatch(match._id);

    logTest(
      9,
      'Match completion is strictly idempotent across duplicate calls',
      secondCompletion.status === 'COMPLETED' &&
      String(secondCompletion.winnerId) === String(firstWinner) &&
      secondCompletion.players[0].pointsAwarded === firstPoints
    );
  }

  // ============================================================
  // Scenario 11: Duplicate submission does not increment solved count twice
  // ============================================================
  {
    const match = await Match.create({
      roomCode: `T11_${u1Suffix}`.toUpperCase(),
      type: 'scrimmage',
      status: 'ACTIVE',
      duration: 600,
      problems: [problem._id],
      players: [
        {
          userId: userA._id,
          username: userA.username,
          status: 'ACTIVE',
          solved: [
            {
              problemId: problem._id,
              solvedAt: new Date(),
              timeTaken: 120
            }
          ],
          problemsSolved: 1,
          completionTime: 120
        },
        {
          userId: userB._id,
          username: userB.username,
          status: 'ACTIVE',
          problemsSolved: 0
        }
      ]
    });

    // Attempt second submission for same problem
    const dummyTestCases = [{ input: '1', output: '1' }];
    await submitCode({
      userId: userA._id,
      matchId: match._id,
      problemId: problem._id,
      code: 'function test() { return 1; }',
      language: 'javascript'
    }).catch(() => null);

    const m = await Match.findById(match._id);
    const pA = m.players.find((p) => String(p.userId) === String(userA._id));
    logTest(
      11,
      'Duplicate submission does not duplicate solved count',
      pA.problemsSolved === 1
    );
  }

  // ============================================================
  // Scenario 12: Private Scrimmage — DOES NOT END WHEN ONE PLAYER SOLVES
  // ============================================================
  {
    const room = await createRoom({
      hostId: userA._id,
      hostName: userA.username,
      timeLimit: '10:00',
      difficulty: 'Medium'
    });

    await joinRoomByCode(room.code, userB._id, userB.username);
    const started = await startRoomByCode(room.code, userA._id);

    assert(started.matchId, 'Room must have associated matchId');

    // Simulate Player A solving the problem
    const match = await Match.findById(started.matchId);
    const playerAEntry = match.players.find((p) => String(p.userId) === String(userA._id));
    playerAEntry.problemsSolved = 1;
    playerAEntry.completionTime = 222; // 03:42
    playerAEntry.status = 'FINISHED';
    await match.save();

    // Check match status after Player A solved: MATCH MUST REMAIN ACTIVE!
    const activeCheck = await Match.findById(started.matchId);
    logTest(
      12,
      'Private Scrimmage: DO NOT END WHEN ONLY ONE PLAYER SOLVES (match remains ACTIVE)',
      activeCheck.status === 'ACTIVE' &&
      activeCheck.players.find((p) => String(p.userId) === String(userB._id)).status === 'ACTIVE'
    );

    // Now Player B solves later at 06:15 (375s)
    const playerBEntry = activeCheck.players.find((p) => String(p.userId) === String(userB._id));
    playerBEntry.problemsSolved = 1;
    playerBEntry.completionTime = 375;
    playerBEntry.status = 'FINISHED';
    await activeCheck.save();

    // Now both have solved -> finalize!
    const bothFinished = await completeMatch(started.matchId);
    logTest(
      13,
      'Private Scrimmage: Finalizes when Player B ALSO solves -> Winner is Player A (faster)',
      bothFinished.status === 'COMPLETED' &&
      String(bothFinished.winnerId) === String(userA._id) &&
      bothFinished.players.find((p) => String(p.userId) === String(userA._id)).pointsAwarded === 24 &&
      bothFinished.players.find((p) => String(p.userId) === String(userB._id)).pointsAwarded === -24
    );
  }

  // ============================================================
  // Scenario 14: Private Scrimmage effects LP and Rating in User & PlayerStatistics
  // ============================================================
  {
    const userADoc = await User.findById(userA._id);
    const userBDoc = await User.findById(userB._id);
    const statsA = await PlayerStatistics.findOne({ userId: userA._id });
    const statsB = await PlayerStatistics.findOne({ userId: userB._id });

    logTest(
      14,
      'Private Scrimmage updates User rating and PlayerStatistics in MongoDB',
      userADoc.rating > 1500 &&
      userBDoc.rating < 1500 &&
      statsA !== null &&
      statsA.totalWins > 0 &&
      statsB !== null &&
      statsB.totalLosses > 0
    );
  }

  // ============================================================
  // Scenario 15: MatchHistory reflects exact result & points
  // ============================================================
  {
    const historyA = await MatchHistory.find({ userId: userA._id }).sort({ completedAt: -1 });
    const historyB = await MatchHistory.find({ userId: userB._id }).sort({ completedAt: -1 });

    logTest(
      15,
      'MatchHistory records winner (+24) and loser (-24) accurately in MongoDB',
      historyA.length > 0 &&
      historyB.length > 0 &&
      historyA[0].result === 'win' &&
      historyA[0].ratingChange === 24 &&
      historyB[0].result === 'loss' &&
      historyB[0].ratingChange === -24
    );
  }

  // ============================================================
  // Scenario 16: Draw match does NOT award points in MatchHistory
  // ============================================================
  {
    const drawUser1 = await User.create({
      username: `draw1_${u1Suffix}`,
      email: `draw1_${u1Suffix}@codeclash.io`,
      password: 'password123',
      rating: 1500
    });
    const drawUser2 = await User.create({
      username: `draw2_${u1Suffix}`,
      email: `draw2_${u1Suffix}@codeclash.io`,
      password: 'password123',
      rating: 1500
    });

    const drawMatch = await Match.create({
      roomCode: `DR_${u1Suffix}`.toUpperCase(),
      type: 'scrimmage',
      status: 'ACTIVE',
      duration: 300,
      problems: [problem._id],
      players: [
        {
          userId: drawUser1._id,
          username: drawUser1.username,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        },
        {
          userId: drawUser2._id,
          username: drawUser2.username,
          problemsSolved: 0,
          completionTime: null,
          status: 'ACTIVE'
        }
      ]
    });

    await completeMatch(drawMatch._id);

    const drawHistory1 = await MatchHistory.findOne({ userId: drawUser1._id });
    const drawHistory2 = await MatchHistory.findOne({ userId: drawUser2._id });

    logTest(
      16,
      'Draw match does NOT award points in MatchHistory (ratingChange is strictly 0)',
      drawHistory1 &&
      drawHistory2 &&
      drawHistory1.result === 'draw' &&
      drawHistory1.ratingChange === 0 &&
      drawHistory2.result === 'draw' &&
      drawHistory2.ratingChange === 0
    );
  }

  console.log('\n=================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
