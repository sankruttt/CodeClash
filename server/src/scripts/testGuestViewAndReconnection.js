import assert from 'assert';
import { connectDatabase, isMongoConnected } from '../config/database.js';
import roomService from '../services/roomService.js';

async function testGuestAndReconnection() {
  await connectDatabase();
  console.log('Testing Guest View and Reconnection State...\n');

  const hostId = `host_${Date.now()}`;
  const guestId = `guest_${Date.now()}`;

  // 1. Host creates room
  const room = await roomService.createRoom({ hostId, hostName: 'Host_Alice' });
  const code = room.code;
  console.log(`1. Room created: ${code} by ${hostId}`);

  // 2. Guest joins room
  const joined = await roomService.joinRoomByCode(code, guestId, 'Guest_Bob');
  assert.strictEqual(joined.status, 'ready');
  assert.strictEqual(joined.guestId, guestId);
  console.log(`2. Guest joined: ${guestId}, status is ready`);

  // 3. Verify Guest cannot start match
  let guestStartRejected = false;
  try {
    await roomService.startRoomByCode(code, guestId);
  } catch (err) {
    guestStartRejected = true;
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.code, 'NOT_ROOM_OWNER');
  }
  assert(guestStartRejected, 'Guest must be rejected from starting match');
  console.log('3. Guest start request correctly rejected with 403 Forbidden');

  // 4. Host starts match
  const started = await roomService.startRoomByCode(code, hostId);
  assert.strictEqual(started.status, 'in_progress');
  console.log('4. Host starts match: status is in_progress');

  // 5. Reconnection: Both host and guest fetch room after refresh
  const hostRefreshed = await roomService.getRoomByCode(code);
  assert.strictEqual(hostRefreshed.status, 'in_progress');
  assert.strictEqual(hostRefreshed.hostId, hostId);
  assert.strictEqual(hostRefreshed.guestId, guestId);
  console.log('5. Reconnection: Room state persists in_progress with both players');

  console.log('\nAll Guest & Reconnection Tests Passed!');
  process.exit(0);
}

testGuestAndReconnection().catch(err => {
  console.error(err);
  process.exit(1);
});
