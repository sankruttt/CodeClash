import 'dotenv/config';
import mongoose from 'mongoose';
import assert from 'assert';

import Match from '../models/Match.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import CodingProblem from '../models/CodingProblem.js';
import TestCase from '../models/TestCase.js';

import {
  completeMatch,
  getMatchById,
  createPrivateMatch
} from '../services/matchService.js';
import {
  createRoom,
  joinRoomByCode,
  startRoomByCode,
  updateRoomSettings
} from '../services/roomService.js';
import { submitCode } from '../services/submissionService.js';
import { joinQueue, getQueueStatus, leaveQueue } from '../services/matchmakingService.js';

let passed = 0;
let failed = 0;

function logTest(num, name, condition, details = '') {
  if (condition) {
    console.log(`✓ Test ${num}: ${name}`);
    passed++;
  } else {
    console.error(`✗ Test ${num}: ${name} - FAILED! ${details}`);
    failed++;
  }
}

async function run() {
  console.log('=== STARTING TEST SUITE: RANKED & SCRIMMAGE RULES ===\n');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codeclash');

  const suffix = Date.now().toString(36);
  let codeCounter = 0;
  const uniqueCode = (pfx) => `${pfx}_${Math.random().toString(36).slice(2, 6)}_${++codeCounter}`.slice(0, 16).toUpperCase();

  const userA = await User.create({
    username: `alice_${suffix}_${Math.random().toString(36).slice(2, 5)}`,
    email: `alice_${suffix}_${Math.random().toString(36).slice(2, 5)}@test.io`,
    password: 'password123',
    rating: 1500
  });

  const userB = await User.create({
    username: `bob_${suffix}_${Math.random().toString(36).slice(2, 5)}`,
    email: `bob_${suffix}_${Math.random().toString(36).slice(2, 5)}@test.io`,
    password: 'password123',
    rating: 1500
  });

  // Fetch up to 3 problems from MongoDB
  const problems = await CodingProblem.find({ isActive: true }).limit(3);
  assert(problems.length >= 1, 'At least 1 CodingProblem required in MongoDB');

  const p1 = problems[0];
  const p2 = problems[1] || problems[0];
  const p3 = problems[2] || problems[0];

  // Helper to ensure test cases exist for problem
  for (const p of [p1, p2, p3]) {
    const existing = await TestCase.countDocuments({ problemId: p._id });
    if (existing === 0) {
      await TestCase.create({
        problemId: p._id,
        order: 1,
        input: '1 2',
        expectedOutput: '3'
      });
    }
  }

  // -------------------------------------------------------------
  // 1. RANKED - 1 QUESTION: Player A solves -> Immediate completion!
  // -------------------------------------------------------------
  {
    for (const durationMins of [5, 10, 15]) {
      const match = await Match.create({
        roomCode: uniqueCode(`R1Q_${durationMins}`),
        type: 'ranked',
        status: 'ACTIVE',
        questionCount: 1,
        duration: durationMins * 60,
        timeLimit: `${durationMins < 10 ? '0' : ''}${durationMins}:00`,
        startedAt: new Date(),
        problems: [p1._id],
        players: [
          { userId: userA._id, username: userA.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 },
          { userId: userB._id, username: userB.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 }
        ]
      });

      // Player A submits correct code
      const subRes = await submitCode({
        userId: userA._id,
        matchId: match._id,
        problemId: p1._id,
        code: 'return 1;',
        language: 'javascript',
        _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 }
      });

      const updated = await Match.findById(match._id);
      logTest(
        `1.${durationMins}`,
        `Ranked 1-Question (${durationMins}m): Player A solves -> Match ends immediately`,
        updated.status === 'COMPLETED' && String(updated.winnerId) === String(userA._id),
        `Status: ${updated.status}, Winner: ${updated.winnerId}`
      );
    }
  }

  // -------------------------------------------------------------
  // 2. RANKED - 2 QUESTIONS:
  //    Player A solves Q1 -> Continues
  //    Player A solves Q2 -> Match ends immediately! Do not wait for B.
  // -------------------------------------------------------------
  {
    const match = await Match.create({
      roomCode: uniqueCode('R2Q'),
      type: 'ranked',
      status: 'ACTIVE',
      questionCount: 2,
      duration: 600,
      timeLimit: '10:00',
      startedAt: new Date(),
      problems: [p1._id, p2._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 }
      ]
    });

    // Player A solves Q1
    await submitCode({
      userId: userA._id,
      matchId: match._id,
      problemId: p1._id,
      code: 'return 1;',
      language: 'javascript',
      _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 }
    });

    let midState = await Match.findById(match._id);
    logTest(
      '2.1',
      'Ranked 2-Question: Player A solves Q1 -> Match CONTINUES (not completed)',
      midState.status === 'ACTIVE' && midState.players[0].problemsSolved === 1,
      `Status: ${midState.status}, Solved: ${midState.players[0].problemsSolved}`
    );

    // Player A solves Q2
    await submitCode({
      userId: userA._id,
      matchId: match._id,
      problemId: p2._id,
      code: 'return 2;',
      language: 'javascript',
      _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 }
    });

    let finalState = await Match.findById(match._id);
    logTest(
      '2.2',
      'Ranked 2-Question: Player A solves Q2 -> Match ENDS IMMEDIATELY (no wait for Player B)',
      finalState.status === 'COMPLETED' && String(finalState.winnerId) === String(userA._id),
      `Status: ${finalState.status}, Winner: ${finalState.winnerId}`
    );
  }

  // -------------------------------------------------------------
  // 3. RANKED - 3 QUESTIONS:
  //    Player A solves Q1 -> Continues
  //    Player A solves Q2 -> Continues
  //    Player A solves Q3 -> Match ends immediately!
  // -------------------------------------------------------------
  {
    const match = await Match.create({
      roomCode: uniqueCode('R3Q'),
      type: 'ranked',
      status: 'ACTIVE',
      questionCount: 3,
      duration: 900,
      timeLimit: '15:00',
      startedAt: new Date(),
      problems: [p1._id, p2._id, p3._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 }
      ]
    });

    // Q1
    await submitCode({ userId: userA._id, matchId: match._id, problemId: p1._id, code: 'q1', language: 'javascript', _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 } });
    let s1 = await Match.findById(match._id);
    logTest('3.1', 'Ranked 3-Question: Solves Q1 -> Continues', s1.status === 'ACTIVE' && s1.players[0].problemsSolved === 1);

    // Q2
    await submitCode({ userId: userA._id, matchId: match._id, problemId: p2._id, code: 'q2', language: 'javascript', _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 } });
    let s2 = await Match.findById(match._id);
    logTest('3.2', 'Ranked 3-Question: Solves Q2 -> Continues', s2.status === 'ACTIVE' && s2.players[0].problemsSolved === 2);

    // Q3
    await submitCode({ userId: userA._id, matchId: match._id, problemId: p3._id, code: 'q3', language: 'javascript', _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 } });
    let s3 = await Match.findById(match._id);
    logTest('3.3', 'Ranked 3-Question: Solves Q3 -> ENDS IMMEDIATELY', s3.status === 'COMPLETED' && String(s3.winnerId) === String(userA._id));
  }

  // -------------------------------------------------------------
  // 4. RANKED TIMER EXPIRATION:
  //    Neither player completes all questions. Timer reaches 0.
  // -------------------------------------------------------------
  {
    // Case 4A: Player A solved 2, Player B solved 1 -> Player A wins
    const matchA = await Match.create({
      roomCode: uniqueCode('RTE_A'),
      type: 'ranked',
      status: 'ACTIVE',
      questionCount: 3,
      duration: 600,
      startedAt: new Date(Date.now() - 700000), // expired
      problems: [p1._id, p2._id, p3._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, problemsSolved: 2, totalTime: 200, status: 'ACTIVE' },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, problemsSolved: 1, totalTime: 120, status: 'ACTIVE' }
      ]
    });

    const resA = await getMatchById(matchA._id);
    logTest('4.1', 'Ranked Timer Expired: Player A (2 solved) vs Player B (1 solved) -> Player A wins', resA.status === 'COMPLETED' && String(resA.winnerId) === String(userA._id));

    // Case 4B: Equal score (both 1 solved with same time) -> Tie
    const matchTie = await Match.create({
      roomCode: uniqueCode('RTE_T'),
      type: 'ranked',
      status: 'ACTIVE',
      questionCount: 2,
      duration: 600,
      startedAt: new Date(Date.now() - 700000), // expired
      problems: [p1._id, p2._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, problemsSolved: 1, totalTime: 150, status: 'ACTIVE' },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, problemsSolved: 1, totalTime: 150, status: 'ACTIVE' }
      ]
    });

    const resTie = await getMatchById(matchTie._id);
    logTest('4.2', 'Ranked Timer Expired: Equal solves & equal time -> Result is Tie', resTie.status === 'COMPLETED' && (resTie.isDraw === true || resTie.result === 'draw'));

    // Case 4C: Neither player solves anything (0-0) -> Tie
    const matchZero = await Match.create({
      roomCode: uniqueCode('RTE_Z'),
      type: 'ranked',
      status: 'ACTIVE',
      questionCount: 1,
      duration: 600,
      startedAt: new Date(Date.now() - 700000), // expired
      problems: [p1._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, problemsSolved: 0, totalTime: 0, status: 'ACTIVE' },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, problemsSolved: 0, totalTime: 0, status: 'ACTIVE' }
      ]
    });

    const resZero = await getMatchById(matchZero._id);
    logTest('4.3', 'Ranked Timer Expired: Neither player solves (0-0) -> Result is Tie', resZero.status === 'COMPLETED' && (resZero.isDraw === true || resZero.result === 'draw'));
  }

  // -------------------------------------------------------------
  // 5. DASHBOARD ENTER QUEUE DEFAULTS & BACKEND VALIDATION:
  //    Default: 1 Question, 10 Minutes (600 seconds)
  // -------------------------------------------------------------
  {
    const queueEntry = await joinQueue(userA._id, { questionCount: 1, duration: 10 });
    logTest(
      '5.1',
      'Dashboard default queue join: questionCount = 1, duration = 10 minutes',
      queueEntry.questionCount === 1 && queueEntry.duration === 10
    );
    await leaveQueue(userA._id);

    // Test rejection of arbitrary values in matchmaking
    let rejectedArbitrary = false;
    try {
      await joinQueue(userA._id, { questionCount: 7, duration: 42 });
    } catch (err) {
      rejectedArbitrary = true;
    }
    logTest('5.2', 'Arbitrary questionCount/duration in queue rejected by backend validation', rejectedArbitrary);
  }

  // -------------------------------------------------------------
  // 6. PRIVATE SCRIMMAGE - TIMER CONFIGURATION & ROLE PERMISSIONS:
  //    - Only room owner/host can change duration
  //    - Valid durations: 5, 10, 15 Minutes
  //    - Unsupported durations rejected
  // -------------------------------------------------------------
  {
    const room = await createRoom({ hostId: userA._id, hostName: userA.username, timeLimit: '10:00' });
    logTest('6.1', 'Room created with default time limit', ['05:00', '10:00', '15:00'].includes(room.timeLimit));

    // Host updates to 5 Minutes
    const updated5 = await updateRoomSettings(room.code, userA._id, { timeLimit: '05:00' });
    logTest('6.2', 'Host successfully sets time limit to 5 Minutes (05:00)', updated5.timeLimit === '05:00');

    // Host updates to 10 Minutes
    const updated10 = await updateRoomSettings(room.code, userA._id, { timeLimit: '10:00' });
    logTest('6.3', 'Host successfully sets time limit to 10 Minutes (10:00)', updated10.timeLimit === '10:00');

    // Host updates to 15 Minutes
    const updated15 = await updateRoomSettings(room.code, userA._id, { timeLimit: '15:00' });
    logTest('6.4', 'Host successfully sets time limit to 15 Minutes (15:00)', updated15.timeLimit === '15:00');

    // Non-host attempts to update duration -> Must be rejected!
    let nonHostBlocked = false;
    try {
      await updateRoomSettings(room.code, userB._id, { timeLimit: '05:00' });
    } catch (err) {
      nonHostBlocked = true;
    }
    logTest('6.5', 'Non-host attempt to change room duration is rejected', nonHostBlocked);

    // Unsupported duration (e.g. 20:00 or arbitrary) -> Must be rejected!
    let unsupportedBlocked = false;
    try {
      await updateRoomSettings(room.code, userA._id, { timeLimit: '20:00' });
    } catch (err) {
      unsupportedBlocked = true;
    }
    logTest('6.6', 'Unsupported duration (20:00) is rejected by backend', unsupportedBlocked);
  }

  // -------------------------------------------------------------
  // 7. PRIVATE SCRIMMAGE - COMPLETION LOGIC:
  //    - Player A solves all -> Match CONTINUES! Do NOT complete early.
  //    - Match completes only when BOTH finish OR timer expires.
  // -------------------------------------------------------------
  {
    const scrimMatch = await Match.create({
      roomCode: uniqueCode('SCRIM'),
      type: 'scrimmage',
      status: 'ACTIVE',
      questionCount: 1,
      duration: 600,
      timeLimit: '10:00',
      startedAt: new Date(),
      problems: [p1._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, status: 'ACTIVE', problemsSolved: 0 }
      ]
    });

    // Player A solves the problem
    await submitCode({
      userId: userA._id,
      matchId: scrimMatch._id,
      problemId: p1._id,
      code: 'return 1;',
      language: 'javascript',
      _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 }
    });

    const scrimAfterA = await Match.findById(scrimMatch._id);
    logTest(
      '7.1',
      'Private Scrimmage: Player A solves all -> Match CONTINUES (does not complete early)',
      scrimAfterA.status === 'ACTIVE' && scrimAfterA.players[0].problemsSolved === 1,
      `Status: ${scrimAfterA.status}, Solved: ${scrimAfterA.players[0].problemsSolved}`
    );

    // Player B can continue solving and then submits
    await submitCode({
      userId: userB._id,
      matchId: scrimMatch._id,
      problemId: p1._id,
      code: 'return 1;',
      language: 'javascript',
      _mockResult: { status: 'Accepted', passedTests: 1, totalTests: 1 }
    });

    const scrimAfterB = await Match.findById(scrimMatch._id);
    logTest(
      '7.2',
      'Private Scrimmage: Both finish -> Match COMPLETES',
      scrimAfterB.status === 'COMPLETED' && scrimAfterB.players.every((p) => p.problemsSolved === 1),
      `Status: ${scrimAfterB.status}`
    );
  }

  // -------------------------------------------------------------
  // 8. PRIVATE SCRIMMAGE - ONLY ONE FINISHES & TIMER EXPIRES:
  // -------------------------------------------------------------
  {
    const scrimPartial = await Match.create({
      roomCode: uniqueCode('SCREXP'),
      type: 'scrimmage',
      status: 'ACTIVE',
      questionCount: 1,
      duration: 600,
      startedAt: new Date(Date.now() - 700000), // expired
      problems: [p1._id],
      players: [
        { userId: userA._id, username: userA.username, ratingBefore: 1500, problemsSolved: 1, totalTime: 180, status: 'FINISHED' },
        { userId: userB._id, username: userB.username, ratingBefore: 1500, problemsSolved: 0, totalTime: 0, status: 'ACTIVE' }
      ]
    });

    const completedPartial = await getMatchById(scrimPartial._id);
    logTest(
      '8.1',
      'Private Scrimmage: Only Player A finished, timer expires -> Match completes with Player A as winner',
      completedPartial.status === 'COMPLETED' && String(completedPartial.winnerId) === String(userA._id)
    );
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});
