// Test script for Frontend-Backend Compatibility Contract
const BASE_URL = 'http://localhost:3001/api';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`\x1b[32m✓ PASS:\x1b[0m ${message}`);
  } else {
    testsFailed++;
    console.error(`\x1b[31m✗ FAIL:\x1b[0m ${message}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runFrontendCompatibilityTests() {
  console.log('\n======================================================');
  console.log('🧪 Testing Frontend API Contract Compatibility');
  console.log('======================================================\n');

  // 1. Room API: Create Room
  const hostId = `host_${Date.now()}`;
  const hostName = 'Kaelen';
  const createRes = await apiRequest('/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ hostId, hostName })
  });
  
  assert(createRes.ok && createRes.status === 201, 'POST /rooms/create returns 201');
  assert(createRes.data.code && typeof createRes.data.code === 'string', 'POST /rooms/create returns data.code directly');
  assert(createRes.data.room && createRes.data.room.code === createRes.data.code, 'POST /rooms/create returns data.room object');
  const roomCode = createRes.data.code;

  // 2. Room API: Get Room
  const getRoomRes = await apiRequest(`/rooms/${roomCode}`);
  assert(getRoomRes.ok, `GET /rooms/${roomCode} succeeds`);
  assert(getRoomRes.data.room && getRoomRes.data.room.status === 'waiting', 'Room status is initially "waiting"');
  assert(Array.isArray(getRoomRes.data.room.questions) && getRoomRes.data.room.questions.length > 0, 'Room contains default questions');

  // 3. Room API: Join Room (Validation: Cannot join own room)
  const joinOwnRes = await apiRequest('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId: hostId, playerName: hostName })
  });
  assert(joinOwnRes.status === 400, 'POST /rooms/join rejects host joining own room with 400');
  assert(joinOwnRes.data.error || joinOwnRes.data.message, 'Error response contains human-readable error/message');

  // 4. Room API: Join Room (Valid guest)
  const guestId = `guest_${Date.now()}`;
  const guestName = 'v0_Sniper';
  const joinRes = await apiRequest('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId: guestId, playerName: guestName })
  });
  assert(joinRes.ok, 'POST /rooms/join succeeds for guest');
  assert(joinRes.data.room && joinRes.data.room.status === 'ready', 'Room status is updated to "ready" after guest joins');
  assert(joinRes.data.room.guestId === guestId, 'Room has guestId populated');

  // 5. Room API: Start Battle
  const startRes = await apiRequest(`/rooms/${roomCode}/start`, {
    method: 'POST'
  });
  assert(startRes.ok, `POST /rooms/${roomCode}/start succeeds`);
  assert(startRes.data.room && startRes.data.room.status === 'in_progress', 'Room status updated to "in_progress"');

  // 6. Match API: Create Match (Frontend Scrimmage contract)
  const matchRes = await apiRequest('/matches/create', {
    method: 'POST',
    body: JSON.stringify({
      roomCode,
      player1: { id: hostId, name: hostName },
      player2: { id: guestId, name: guestName },
      questions: startRes.data.room.questions
    })
  });
  assert(matchRes.ok && matchRes.status === 201, 'POST /matches/create succeeds unauthenticated');
  assert(matchRes.data.match && matchRes.data.match.id, 'POST /matches/create returns match with ID');
  const matchId = matchRes.data.match.id;

  // 7. Match API: Update Progress
  const progressRes = await apiRequest(`/matches/${matchId}/progress`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: hostId,
      questionIndex: 0,
      time: 45
    })
  });
  assert(progressRes.ok, `POST /matches/${matchId}/progress succeeds unauthenticated`);
  assert(progressRes.data.match && progressRes.data.match.players, 'Progress update returns updated match');

  // 8. Match API: Get Match
  const getMatchRes = await apiRequest(`/matches/${matchId}`);
  assert(getMatchRes.ok, `GET /matches/${matchId} succeeds unauthenticated`);
  assert(getMatchRes.data.match && getMatchRes.data.match.id === matchId, 'GET /matches/:id returns match details');

  // 9. Match API: Complete Match
  const completeRes = await apiRequest(`/matches/${matchId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      winner: hostId,
      scores: { [hostId]: 100, [guestId]: 60 }
    })
  });
  assert(completeRes.ok, `POST /matches/${matchId}/complete succeeds unauthenticated`);
  assert(completeRes.data.match && completeRes.data.match.status.toLowerCase() === 'completed', 'Match status is completed');
  assert(completeRes.data.match.winner === hostId, 'Match winner is set correctly');

  // 10. Room API: Leave Room
  const leaveRes = await apiRequest(`/rooms/${roomCode}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostId })
  });
  assert(leaveRes.ok, `POST /rooms/${roomCode}/leave succeeds`);

  // 11. Player API: Register Player
  const playerId = `usr_${Date.now()}`;
  const registerRes = await apiRequest('/players/register', {
    method: 'POST',
    body: JSON.stringify({
      id: playerId,
      name: 'CyberNinja',
      rating: 1850
    })
  });
  assert(registerRes.ok, 'POST /players/register succeeds');
  assert(registerRes.data.player && registerRes.data.player.name === 'CyberNinja', 'Registered player returns correct name');
  assert(registerRes.data.player.rating === 1850, 'Registered player has rating 1850');

  // 12. Player API: Get Player
  const getPlayerRes = await apiRequest(`/players/${playerId}`);
  assert(getPlayerRes.ok, `GET /players/${playerId} succeeds`);
  assert(getPlayerRes.data.player && getPlayerRes.data.player.name === 'CyberNinja', 'Fetched player matches');

  // 13. Error handling: 404 on non-existent room
  const nonExistentRoomRes = await apiRequest('/rooms/NONEXISTENT');
  assert(nonExistentRoomRes.status === 404, 'GET /rooms/NONEXISTENT returns 404');
  assert(nonExistentRoomRes.data.error || nonExistentRoomRes.data.message, '404 contains error message for UI');

  console.log('\n======================================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runFrontendCompatibilityTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
