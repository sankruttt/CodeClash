import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Match from '../models/Match.js';
import CodingProblem from '../models/CodingProblem.js';
import * as roomService from '../services/roomService.js';
import { submitCode } from '../services/submissionService.js';
import { completeMatch } from '../services/matchService.js';

const combinations = [
  { difficulty: 'Easy', timeLimit: '05:00', durationSec: 300 },
  { difficulty: 'Easy', timeLimit: '10:00', durationSec: 600 },
  { difficulty: 'Easy', timeLimit: '15:00', durationSec: 900 },
  { difficulty: 'Medium', timeLimit: '05:00', durationSec: 300 },
  { difficulty: 'Medium', timeLimit: '10:00', durationSec: 600 },
  { difficulty: 'Medium', timeLimit: '15:00', durationSec: 900 },
  { difficulty: 'Hard', timeLimit: '05:00', durationSec: 300 },
  { difficulty: 'Hard', timeLimit: '10:00', durationSec: 600 },
  { difficulty: 'Hard', timeLimit: '15:00', durationSec: 900 },
];

async function runTests() {
  console.log('=== Starting Private Scrimmage Configuration Tests ===\n');
  await mongoose.connect(process.env.MONGODB_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Validation tests
  console.log('--- Test 1: Backend Validation on Invalid Difficulty and Duration ---');
  try {
    await roomService.createRoom({
      hostId: 'test_host',
      hostName: 'HostTester',
      difficulty: 'SuperHard',
      timeLimit: '10:00'
    });
    assert(false, 'Should reject invalid difficulty "SuperHard"');
  } catch (err) {
    assert(err.statusCode === 400 || err.message.includes('difficulty') || err.code === 'VALIDATION_ERROR', 'Rejected invalid difficulty "SuperHard"');
  }

  try {
    await roomService.createRoom({
      hostId: 'test_host',
      hostName: 'HostTester',
      difficulty: 'Medium',
      timeLimit: '20:00'
    });
    assert(false, 'Should reject invalid timeLimit "20:00"');
  } catch (err) {
    assert(err.statusCode === 400 || err.message.includes('duration') || err.code === 'VALIDATION_ERROR', 'Rejected invalid timeLimit "20:00"');
  }

  // 2. Test each of the 9 combinations
  for (let i = 0; i < combinations.length; i++) {
    const { difficulty, timeLimit, durationSec } = combinations[i];
    console.log(`\n--- Test Combination ${i + 1}/9: [${difficulty} + ${timeLimit} (${durationSec}s)] ---`);

    // A. Create room with configuration
    const hostId = `host_combo_${i}_${Date.now()}`;
    const guestId = `guest_combo_${i}_${Date.now()}`;

    const room = await roomService.createRoom({
      hostId,
      hostName: `Host_${difficulty}`,
      difficulty,
      timeLimit,
      duration: durationSec
    });

    assert(room.difficulty === difficulty, `Room created with difficulty: ${room.difficulty} (expected ${difficulty})`);
    assert(room.timeLimit === timeLimit, `Room created with timeLimit: ${room.timeLimit} (expected ${timeLimit})`);
    assert(room.duration === durationSec, `Room created with duration: ${room.duration}s (expected ${durationSec}s)`);

    // B. Verify join room preserves settings
    const joined = await roomService.joinRoomByCode(room.code, guestId, `Guest_${difficulty}`);
    assert(joined.status === 'ready', 'Room status updated to "ready" upon guest join');
    assert(joined.difficulty === difficulty, `Joined room preserves difficulty: ${joined.difficulty}`);
    assert(joined.duration === durationSec, `Joined room preserves duration: ${joined.duration}s`);
    assert(joined.timeLimit === timeLimit, `Joined room preserves timeLimit: ${joined.timeLimit}`);

    // C. Start room match
    const started = await roomService.startRoomByCode(room.code, hostId);
    assert(started.status === 'in_progress', 'Room status transitioned to "in_progress"');
    assert(started.difficulty === difficulty, `Started room difficulty is ${started.difficulty}`);
    assert(started.duration === durationSec, `Started room duration is ${started.duration}s`);
    assert(started.timeLimit === timeLimit, `Started room timeLimit is ${started.timeLimit}`);
    assert(started.questions && started.questions.length > 0, 'Room has selected problem questions');

    const roomProblem = started.questions[0];
    assert(roomProblem.difficulty === difficulty, `Selected problem "${roomProblem.title}" difficulty is ${roomProblem.difficulty} (matches ${difficulty})`);

    // D. Verify Match document in MongoDB
    const match = await Match.findById(started.matchId).populate('problems');
    assert(match !== null, 'Authoritative Match document exists in MongoDB');
    assert(match.difficulty === difficulty, `Match document difficulty: ${match.difficulty}`);
    assert(match.duration === durationSec, `Match document duration: ${match.duration}s`);
    assert(match.timeLimit === timeLimit, `Match document timeLimit: ${match.timeLimit}`);
    assert(match.isPrivate === true, 'Match isPrivate is true');
    assert(match.type === 'private', 'Match type is "private"');

    const matchProblem = match.problems[0];
    assert(matchProblem && matchProblem.difficulty === difficulty, `Match problem "${matchProblem?.title}" difficulty is ${matchProblem?.difficulty}`);

    // E. Verify both players receive identical problem, duration, and startedAt
    assert(String(started.startedAt) === String(match.startedAt), 'Room startedAt and Match startedAt are synchronized');

    // Clean up test documents
    await Room.deleteOne({ _id: room._id });
    await Match.deleteOne({ _id: match._id });
  }

  // 3. Test Room Settings Update (e.g. host changes difficulty and timeLimit)
  console.log('\n--- Test 3: Host Changes Settings in Waiting Lounge ---');
  const dynamicHost = `dyn_host_${Date.now()}`;
  const dynRoom = await roomService.createRoom({
    hostId: dynamicHost,
    hostName: 'DynHost',
    difficulty: 'Easy',
    timeLimit: '05:00',
    duration: 300
  });
  assert(dynRoom.difficulty === 'Easy' && dynRoom.duration === 300, 'Initial room set to Easy + 5 min');

  const updated1 = await roomService.updateRoomSettings(dynRoom.code, {
    difficulty: 'Hard',
    timeLimit: '15:00',
    duration: 900,
    hostId: dynamicHost
  });
  assert(updated1.difficulty === 'Hard', 'Updated difficulty to Hard');
  assert(updated1.timeLimit === '15:00' && updated1.duration === 900, 'Updated timeLimit to 15:00 (900s)');
  assert(updated1.questions[0]?.difficulty === 'Hard', `Updated sample question difficulty to Hard: ${updated1.questions[0]?.title}`);

  // Test invalid update rejected
  try {
    await roomService.updateRoomSettings(dynRoom.code, {
      difficulty: 'InvalidDiff',
      hostId: dynamicHost
    });
    assert(false, 'Should reject invalid difficulty on update');
  } catch (err) {
    assert(true, 'Rejected invalid difficulty on update');
  }

  // Clean up
  await Room.deleteOne({ _id: dynRoom._id });

  // 4. Test Scrimmage Multi-Player Completion Rule & Configured Duration Preservation
  console.log('\n--- Test 4: Scrimmage Does Not End on Single Player Solve & Preserves Configured Duration ---');
  const scrimHost = `scrim_host_${Date.now()}`;
  const scrimGuest = `scrim_guest_${Date.now()}`;
  const sRoom = await roomService.createRoom({
    hostId: scrimHost,
    hostName: 'ScrimHost',
    difficulty: 'Medium',
    timeLimit: '10:00',
    duration: 600
  });
  await roomService.joinRoomByCode(sRoom.code, scrimGuest, 'ScrimGuest');
  const sStarted = await roomService.startRoomByCode(sRoom.code, scrimHost);
  const sMatch = await Match.findById(sStarted.matchId);
  const probId = sMatch.problems[0];

  // Player 1 submits Accepted solution
  await submitCode({
    userId: scrimHost,
    matchId: sMatch._id,
    problemId: probId,
    code: 'def solve(): return True',
    language: 'python',
    _mockResult: {
      status: 'Accepted',
      passedTests: 3,
      totalTests: 3,
      executionTime: 25,
      testResults: []
    }
  });

  const matchAfterP1 = await Match.findById(sMatch._id);
  assert(matchAfterP1.status === 'ACTIVE', 'Match remains ACTIVE after Player 1 solves (does NOT end immediately)');
  const p1 = matchAfterP1.players.find(p => String(p.userId) === String(scrimHost));
  assert(p1.problemsSolved === 1, 'Player 1 problemsSolved is 1');

  // Match completes when timer expires or explicitly finalized
  const completedMatch = await completeMatch(sMatch._id);
  assert(completedMatch.status === 'COMPLETED', 'Match status is COMPLETED upon completeMatch');
  assert(completedMatch.duration === 600, `Configured match.duration preserved as ${completedMatch.duration}s (did not overwrite with elapsed seconds)`);

  // Clean up
  await Room.deleteOne({ _id: sRoom._id });
  await Match.deleteOne({ _id: sMatch._id });

  console.log(`\n========================================`);
  console.log(`Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
