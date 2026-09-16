import assert from 'assert';
import { connectDatabase, isMongoConnected } from '../config/database.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { inMemoryStore } from '../services/inMemoryStore.js';
import streakService, { toDateKey, getDayDifference } from '../services/streakService.js';
import roomService from '../services/roomService.js';

console.log('═══════════════════════════════════════════');
console.log('  🧪 Testing Streak & Private Lobby Features');
console.log('═══════════════════════════════════════════\n');

async function runTests() {
  await connectDatabase();
  const usingMongo = isMongoConnected();
  console.log(`📡 Storage Backend: ${usingMongo ? 'MongoDB' : 'In-Memory Store'}\n`);

  // ==========================================
  // PART 1: STREAK CALCULATION & PERSISTENCE
  // ==========================================
  console.log('🔥 1. Testing Streak Logic & Edge Cases...');

  // Create a test user
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testUsername = `stk_${uniqueSuffix}`;
  const testEmail = `tester_${uniqueSuffix}@codeclash.io`;

  let testUser;
  if (usingMongo) {
    testUser = await User.create({
      username: testUsername,
      email: testEmail,
      password: 'TestPassword123!',
      avatar: 'ST'
    });
  } else {
    const res = await inMemoryStore.createUser({
      username: testUsername,
      email: testEmail,
      password: 'TestPassword123!',
      avatar: 'ST'
    });
    testUser = res.user;
  }

  const userId = testUser.id || testUser._id.toString();

  // Test 1.0: Initial state before any activity
  const initialStreak = await streakService.getUserStreak(userId);
  assert.strictEqual(initialStreak.streak, 0, 'Initial streak should be 0');
  assert.strictEqual(initialStreak.longestStreak, 0, 'Initial longest streak should be 0');
  assert.strictEqual(initialStreak.todayCompleted, false, 'Initial todayCompleted should be false');
  console.log('  ✓ Initial user streak is 0 and todayCompleted is false');

  // Test 1.1: First activity ever
  const day1 = new Date('2026-09-01T10:00:00Z');
  const res1 = await streakService.recordUserActivity(userId, day1);
  assert.strictEqual(res1.streak, 1, 'First activity should set streak to 1');
  assert.strictEqual(res1.longestStreak, 1, 'First activity should set longestStreak to 1');
  assert.strictEqual(res1.todayCompleted, true, 'First activity should mark todayCompleted true');
  console.log('  ✓ First activity sets streak to 1 and longestStreak to 1');

  // Test 1.2: Multiple activities on the same day (should NOT increase streak)
  const day1Later = new Date('2026-09-01T18:30:00Z');
  const res1Duplicate = await streakService.recordUserActivity(userId, day1Later);
  assert.strictEqual(res1Duplicate.streak, 1, 'Same-day second activity must not increase streak');
  assert.strictEqual(res1Duplicate.longestStreak, 1, 'Longest streak remains unchanged on same day');
  assert.strictEqual(res1Duplicate.todayCompleted, true, 'todayCompleted remains true');
  console.log('  ✓ Multiple activities on same day do not increase streak');

  // Test 1.3: Consecutive day activity (Day 2)
  const day2 = new Date('2026-09-02T12:00:00Z');
  const res2 = await streakService.recordUserActivity(userId, day2);
  assert.strictEqual(res2.streak, 2, 'Consecutive day activity should increase streak to 2');
  assert.strictEqual(res2.longestStreak, 2, 'Longest streak updates to 2');
  assert.strictEqual(res2.todayCompleted, true, 'todayCompleted is true for day 2');
  console.log('  ✓ Consecutive day increases streak from 1 to 2');

  // Test 1.4: Consecutive day activity (Day 3)
  const day3 = new Date('2026-09-03T09:15:00Z');
  const res3 = await streakService.recordUserActivity(userId, day3);
  assert.strictEqual(res3.streak, 3, 'Consecutive day activity should increase streak to 3');
  assert.strictEqual(res3.longestStreak, 3, 'Longest streak updates to 3');
  console.log('  ✓ Consecutive day increases streak from 2 to 3');

  // Test 1.5: Inspection on a missed day without activity yet
  // Last active was Day 3. Now simulate inspecting on Day 5 (Day 4 was completely missed!)
  const day5BeforeActivity = new Date('2026-09-05T08:00:00Z');
  const checkDay5 = await streakService.getUserStreak(userId, day5BeforeActivity);
  assert.strictEqual(checkDay5.streak, 0, 'Streak should be lapsed (0) on Day 5 because Day 4 was missed');
  assert.strictEqual(checkDay5.longestStreak, 3, 'Longest streak of 3 must remain preserved');
  assert.strictEqual(checkDay5.todayCompleted, false, 'todayCompleted should be false before activity on Day 5');
  console.log('  ✓ Inspection after missed days shows lapsed active streak (0) while preserving longest streak (3)');

  // Test 1.6: Activity on Day 5 after missed Day 4 (Streak resets to 1, longest preserved at 3)
  const day5 = new Date('2026-09-05T14:00:00Z');
  const res5 = await streakService.recordUserActivity(userId, day5);
  assert.strictEqual(res5.streak, 1, 'Activity after missed day resets current streak to 1');
  assert.strictEqual(res5.longestStreak, 3, 'Longest streak remains preserved at 3');
  assert.strictEqual(res5.todayCompleted, true, 'Day 5 activity marked todayCompleted true');
  console.log('  ✓ Activity after missed days starts fresh streak at 1 and keeps longest streak (3)');

  // Test 1.7: Weekly / 7-day indicators
  const streakStatus = await streakService.getUserStreak(userId, day5);
  assert(Array.isArray(streakStatus.weeklyIndicators), 'weeklyIndicators must be an array');
  assert.strictEqual(streakStatus.weeklyIndicators.length, 7, 'weeklyIndicators must contain 7 days');
  assert.strictEqual(streakStatus.weeklyIndicators[6].isToday, true, 'Last indicator should be today');
  assert.strictEqual(streakStatus.weeklyIndicators[6].completed, true, 'Today should be marked completed');
  console.log('  ✓ 7-day weekly indicators accurately generated');

  // Verify MongoDB persistence directly
  if (usingMongo) {
    const freshUserFromDb = await User.findById(userId);
    assert.strictEqual(freshUserFromDb.streak, 1, 'Database streak persists correctly');
    assert.strictEqual(freshUserFromDb.longestStreak, 3, 'Database longestStreak persists correctly');
    assert(freshUserFromDb.activityHistory.length >= 4, 'Activity history persisted in MongoDB');
    console.log('  ✓ MongoDB database persistence verified');
  }

  // ==========================================
  // PART 2: PRIVATE LOBBY ROOM OWNER START
  // ==========================================
  console.log('\n🚪 2. Testing Private Lobby Room Owner Start...');

  const hostId = `host_${uniqueSuffix}`;
  const hostName = 'MasterHost';
  const guestId = `guest_${uniqueSuffix}`;
  const guestName = 'ChallengerGuest';
  const strangerId = `stranger_${uniqueSuffix}`;

  // Test 2.1: Host creates room
  const room = await roomService.createRoom({ hostId, hostName });
  assert(room && room.code, 'Room should be created with a code');
  assert.strictEqual(room.hostId, hostId, 'Room hostId must match creator');
  assert.strictEqual(room.status, 'waiting', 'Initial room status must be waiting');
  console.log(`  ✓ Room ${room.code} created by ${hostName} with status 'waiting'`);

  // Test 2.2: Owner cannot start before required players have joined
  let ownerPrematureFailed = false;
  try {
    await roomService.startRoomByCode(room.code, hostId);
  } catch (err) {
    ownerPrematureFailed = true;
    assert.strictEqual(err.statusCode, 400, 'Premature start must return 400');
  }
  assert(ownerPrematureFailed, 'Owner must not be able to start before guest joins');
  console.log('  ✓ Owner cannot start match before required players join (400 rejected)');

  // Test 2.3: Non-owner cannot start match
  let strangerStartFailed = false;
  try {
    await roomService.startRoomByCode(room.code, strangerId);
  } catch (err) {
    strangerStartFailed = true;
    assert.strictEqual(err.statusCode, 403, 'Non-owner start must return 403 Forbidden');
    assert.strictEqual(err.code, 'NOT_ROOM_OWNER', 'Error code must be NOT_ROOM_OWNER');
  }
  assert(strangerStartFailed, 'Non-owner must be rejected with 403 Forbidden');
  console.log('  ✓ Non-owner rejected with 403 Forbidden');

  // Test 2.4: Guest joins room
  const joinedRoom = await roomService.joinRoomByCode(room.code, guestId, guestName);
  assert.strictEqual(joinedRoom.guestId, guestId, 'GuestId must be set');
  assert.strictEqual(joinedRoom.status, 'ready', 'Room status must be ready after guest joins');
  console.log(`  ✓ Guest ${guestName} joined room, status is now 'ready'`);

  // Test 2.5: Guest attempts to start match (Must be rejected with 403)
  let guestStartFailed = false;
  try {
    await roomService.startRoomByCode(room.code, guestId);
  } catch (err) {
    guestStartFailed = true;
    assert.strictEqual(err.statusCode, 403, 'Guest start must return 403 Forbidden');
    assert.strictEqual(err.code, 'NOT_ROOM_OWNER', 'Error code must be NOT_ROOM_OWNER');
  }
  assert(guestStartFailed, 'Guest must not be able to start match');
  console.log('  ✓ Guest/non-owner cannot start match even after room is ready (403 Forbidden)');

  // Test 2.6: Room Owner starts the match
  const startedRoom = await roomService.startRoomByCode(room.code, hostId);
  assert.strictEqual(startedRoom.status, 'in_progress', 'Room status must be in_progress');
  assert(startedRoom.startedAt, 'startedAt timestamp must be recorded');
  console.log('  ✓ Room owner successfully started the match, status changed to in_progress');

  // Test 2.7: Prevent duplicate start requests (Idempotent handling)
  const duplicateStartRoom = await roomService.startRoomByCode(room.code, hostId);
  assert.strictEqual(duplicateStartRoom.status, 'in_progress', 'Duplicate start must return active room');
  console.log('  ✓ Duplicate start request handled idempotently without error');

  // Test 2.8: Leave handling
  // Create another room to test leave behaviors
  const leaveTestRoom = await roomService.createRoom({ hostId: `host_leave_${uniqueSuffix}`, hostName: 'LeaveHost' });
  await roomService.joinRoomByCode(leaveTestRoom.code, `guest_leave_${uniqueSuffix}`, 'LeaveGuest');
  
  // Guest leaves -> room status resets to waiting
  await roomService.leaveRoomByCode(leaveTestRoom.code, `guest_leave_${uniqueSuffix}`);
  const roomAfterGuestLeft = await roomService.getRoomByCode(leaveTestRoom.code);
  assert.strictEqual(roomAfterGuestLeft.status, 'waiting', 'Room status resets to waiting when guest leaves');
  assert.strictEqual(roomAfterGuestLeft.guestId, null, 'GuestId cleared when guest leaves');
  console.log('  ✓ Guest leaving resets room to waiting and clears guestId');

  // Host leaves -> room is deleted
  await roomService.leaveRoomByCode(leaveTestRoom.code, `host_leave_${uniqueSuffix}`);
  const roomAfterHostLeft = await roomService.getRoomByCode(leaveTestRoom.code);
  assert.strictEqual(roomAfterHostLeft, null, 'Room deleted when host leaves');
  console.log('  ✓ Host leaving deletes room');

  console.log('\n═══════════════════════════════════════════');
  console.log('  🎉 All Streak & Private Lobby Tests Passed!');
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
