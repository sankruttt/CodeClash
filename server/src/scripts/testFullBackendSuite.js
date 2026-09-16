// Exhaustive Backend Test Suite for CodeClash
const BASE_URL = 'http://localhost:3001';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {},
  failures: []
};

function logTest(category, name, passed, details = '') {
  results.total++;
  if (!results.categories[category]) {
    results.categories[category] = { passed: 0, failed: 0 };
  }
  
  if (passed) {
    results.passed++;
    results.categories[category].passed++;
    console.log(`  \x1b[32m✓ [${category}]\x1b[0m ${name}`);
  } else {
    results.failed++;
    results.categories[category].failed++;
    results.failures.push({ category, name, details });
    console.error(`  \x1b[31m✗ [${category}]\x1b[0m ${name} — ${details}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const fetchOpts = { method: options.method || 'GET', headers };
  if (options.body) fetchOpts.body = JSON.stringify(options.body);

  const res = await fetch(url, fetchOpts);
  let data = null;
  const cType = res.headers.get('content-type') || '';
  if (cType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { raw: await res.text() };
  }
  return { status: res.status, ok: res.ok, data };
}

async function runExhaustiveSuite() {
  console.log('\n===============================================================');
  console.log('  🛡️  CODECLASH EXHAUSTIVE BACKEND TEST SUITE');
  console.log('===============================================================\n');

  // ==========================================
  // 1. HEALTH & CORE API
  // ==========================================
  console.log('\n--- 1. Health & Core Infrastructure ---');
  const health = await request('/api/health');
  logTest('Health', 'Health endpoint returns 200 and status ok', health.status === 200 && health.data?.status === 'ok');
  logTest('Health', 'Health endpoint exposes database type', Boolean(health.data?.database));
  logTest('Health', 'Health endpoint reports telemetry counters', 
    typeof health.data?.rooms === 'number' && 
    typeof health.data?.matches === 'number' && 
    typeof health.data?.players === 'number'
  );

  const root = await request('/');
  logTest('Health', 'Root endpoint lists API documentation and routes', root.status === 200 && root.data?.endpoints?.auth);

  const notFound = await request('/api/non-existent-endpoint-xyz-999');
  logTest('Health', 'Unknown routes return standard 404 JSON', notFound.status === 404 && notFound.data?.error === 'NOT_FOUND');

  // ==========================================
  // 2. AUTHENTICATION & SECURITY
  // ==========================================
  console.log('\n--- 2. Authentication & Security ---');
  const stamp = Date.now();
  const userA = {
    username: `userA_${stamp}`,
    email: `usera_${stamp}@test.com`,
    password: 'Password123!',
    avatar: 'UA'
  };
  const userB = {
    username: `userB_${stamp}`,
    email: `userb_${stamp}@test.com`,
    password: 'Password123!',
    avatar: 'UB'
  };

  // Valid registration
  const regA = await request('/api/auth/register', { method: 'POST', body: userA });
  logTest('Auth', 'Register valid user A returns 201 and token', regA.status === 201 && regA.data?.data?.token && regA.data?.data?.user?.id);
  const tokenA = regA.data?.data?.token;
  const userAId = regA.data?.data?.user?.id;

  const regB = await request('/api/auth/register', { method: 'POST', body: userB });
  logTest('Auth', 'Register valid user B returns 201 and token', regB.status === 201 && regB.data?.data?.token);
  const tokenB = regB.data?.data?.token;
  const userBId = regB.data?.data?.user?.id;

  // Duplicate email
  const dupEmail = await request('/api/auth/register', { method: 'POST', body: { ...userA, username: `other_${stamp}` } });
  logTest('Auth', 'Reject duplicate email registration with 409', dupEmail.status === 409);

  // Duplicate username
  const dupUsername = await request('/api/auth/register', { method: 'POST', body: { ...userA, email: `other_${stamp}@test.com` } });
  logTest('Auth', 'Reject duplicate username registration with 409', dupUsername.status === 409);

  // Weak password (< 8 chars or missing uppercase/number)
  const weakPass = await request('/api/auth/register', { method: 'POST', body: { username: `weak_${stamp}`, email: `weak_${stamp}@test.com`, password: 'weak' } });
  logTest('Auth', 'Reject weak password with 400 validation error', weakPass.status === 400 && weakPass.data?.error === 'VALIDATION_ERROR');

  // Invalid email format
  const badEmail = await request('/api/auth/register', { method: 'POST', body: { username: `bad_${stamp}`, email: 'not-an-email', password: 'Password123!' } });
  logTest('Auth', 'Reject invalid email format with 400', badEmail.status === 400);

  // Valid login
  const loginA = await request('/api/auth/login', { method: 'POST', body: { email: userA.email, password: userA.password } });
  logTest('Auth', 'Login with correct credentials returns 200', loginA.status === 200 && loginA.data?.data?.token);

  // Invalid password
  const badPass = await request('/api/auth/login', { method: 'POST', body: { email: userA.email, password: 'WrongPassword!' } });
  logTest('Auth', 'Login with wrong password returns 401', badPass.status === 401);

  // Nonexistent user login
  const noUser = await request('/api/auth/login', { method: 'POST', body: { email: `ghost_${stamp}@test.com`, password: 'Password123!' } });
  logTest('Auth', 'Login with nonexistent user returns 401', noUser.status === 401);

  // Profile authenticated
  const meA = await request('/api/auth/me', { headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Auth', 'GET /api/auth/me with Bearer token returns profile', meA.status === 200 && meA.data?.data?.user?.username === userA.username);

  // Profile unauthenticated
  const meNoAuth = await request('/api/auth/me');
  logTest('Auth', 'GET /api/auth/me without token returns 401', meNoAuth.status === 401);

  // Profile invalid token
  const meBadToken = await request('/api/auth/me', { headers: { Authorization: 'Bearer invalid.token.payload' } });
  logTest('Auth', 'GET /api/auth/me with forged token returns 401', meBadToken.status === 401);

  // ==========================================
  // 3. CODING PROBLEMS SUBSYSTEM
  // ==========================================
  console.log('\n--- 3. Coding Problems Subsystem ---');
  const probsPublic = await request('/api/problems');
  logTest('Problems', 'GET /api/problems works without auth', probsPublic.status === 200 && Array.isArray(probsPublic.data?.data?.problems));
  const problems = probsPublic.data?.data?.problems || [];
  logTest('Problems', 'Problem dataset contains starter code and test cases', problems.length > 0 && Boolean(problems[0].starterCode));

  const firstProblemId = problems[0]?.id || problems[0]?._id;

  const singleProb = await request(`/api/problems/${firstProblemId}`);
  logTest('Problems', `GET /api/problems/:id returns problem spec (${firstProblemId})`, singleProb.status === 200 && singleProb.data?.data?.problem);

  const randProbs = await request('/api/problems/random?count=2');
  logTest('Problems', 'GET /api/problems/random returns random subsets', randProbs.status === 200 && randProbs.data?.data?.problems?.length <= 2);

  const missingProb = await request('/api/problems/000000000000000000000000');
  logTest('Problems', 'GET /api/problems/:id with nonexistent ID returns 404', missingProb.status === 404);

  // ==========================================
  // 4. LEADERBOARD & RANKINGS
  // ==========================================
  console.log('\n--- 4. Leaderboard & Rankings ---');
  const lboardPublic = await request('/api/leaderboard');
  logTest('Leaderboard', 'GET /api/leaderboard works without auth', lboardPublic.status === 200 && Array.isArray(lboardPublic.data?.data?.leaderboard));

  const lboardSorted = await request('/api/leaderboard?sortBy=wins&limit=5');
  logTest('Leaderboard', 'GET /api/leaderboard supports sorting and pagination limit', lboardSorted.status === 200 && lboardSorted.data?.data?.leaderboard?.length <= 5);

  const userRank = await request(`/api/leaderboard/rank/${userAId}`);
  logTest('Leaderboard', 'GET /api/leaderboard/rank/:userId returns rank object', userRank.status === 200 && userRank.data?.data?.rank);

  const histAuth = await request('/api/leaderboard/history/me', { headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Leaderboard', 'GET /api/leaderboard/history/me authenticated returns history list', histAuth.status === 200 && Array.isArray(histAuth.data?.data?.history));

  const histNoAuth = await request('/api/leaderboard/history/me');
  logTest('Leaderboard', 'GET /api/leaderboard/history/me unauthenticated returns 401', histNoAuth.status === 401);

  // ==========================================
  // 5. MATCHMAKING QUEUE
  // ==========================================
  console.log('\n--- 5. Matchmaking Queue Subsystem ---');
  const joinQueueA = await request('/api/matchmaking/join', { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matchmaking', 'User A joins queue successfully', joinQueueA.status === 200 && joinQueueA.data?.success);

  const queueStatusA = await request('/api/matchmaking/status', { headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matchmaking', 'Matchmaking status shows user in queue', queueStatusA.status === 200 && queueStatusA.data?.data?.inQueue === true);

  const dupQueueA = await request('/api/matchmaking/join', { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matchmaking', 'Duplicate join queue attempt returns 409 conflict', dupQueueA.status === 409);

  const leaveQueueA = await request('/api/matchmaking/leave', { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matchmaking', 'User A leaves matchmaking queue', leaveQueueA.status === 200 && leaveQueueA.data?.success);

  const queueStatusAfter = await request('/api/matchmaking/status', { headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matchmaking', 'Matchmaking status shows user is no longer in queue', queueStatusAfter.status === 200 && queueStatusAfter.data?.data?.inQueue === false);

  // ==========================================
  // 6. ROOMS (PEER-TO-PEER SCRIMMAGE)
  // ==========================================
  console.log('\n--- 6. Room Subsystem (Peer-to-Peer Scrimmage) ---');
  const hostId = `host_${stamp}`;
  const hostName = 'Kaelen_Host';
  const guestId = `guest_${stamp}`;
  const guestName = 'Sniper_Guest';

  // Create room
  const createRoomRes = await request('/api/rooms/create', { method: 'POST', body: { hostId, hostName } });
  logTest('Rooms', 'POST /api/rooms/create creates room and returns code & room object', 
    createRoomRes.status === 201 && 
    createRoomRes.data?.code && 
    createRoomRes.data?.room?.code === createRoomRes.data?.code
  );
  const roomCode = createRoomRes.data?.code;

  // Get room
  const getRoomRes = await request(`/api/rooms/${roomCode}`);
  logTest('Rooms', `GET /api/rooms/:code fetches room with status 'waiting'`, getRoomRes.status === 200 && getRoomRes.data?.room?.status === 'waiting');

  // Self-join prevention
  const selfJoin = await request('/api/rooms/join', { method: 'POST', body: { roomCode, playerId: hostId, playerName: hostName } });
  logTest('Rooms', 'Host joining own room rejected with 400', selfJoin.status === 400 && selfJoin.data?.error);

  // Non-existent room join
  const nonExistJoin = await request('/api/rooms/join', { method: 'POST', body: { roomCode: 'ZZZZ99', playerId: guestId, playerName: guestName } });
  logTest('Rooms', 'Joining non-existent room returns 404', nonExistJoin.status === 404);

  // Guest join
  const guestJoin = await request('/api/rooms/join', { method: 'POST', body: { roomCode, playerId: guestId, playerName: guestName } });
  logTest('Rooms', 'Guest join updates room status to "ready" with guestId', guestJoin.status === 200 && guestJoin.data?.room?.status === 'ready' && guestJoin.data?.room?.guestId === guestId);

  // Full room join (3rd player)
  const thirdJoin = await request('/api/rooms/join', { method: 'POST', body: { roomCode, playerId: 'player3', playerName: 'Third_Player' } });
  logTest('Rooms', 'Joining already full/ready room rejected with 400', thirdJoin.status === 400);

  // Start room battle
  const startRoom = await request(`/api/rooms/${roomCode}/start`, { method: 'POST' });
  logTest('Rooms', 'POST /api/rooms/:code/start updates status to "in_progress"', startRoom.status === 200 && startRoom.data?.room?.status === 'in_progress');

  // Guest leaves room
  const leaveRoom = await request(`/api/rooms/${roomCode}/leave`, { method: 'POST', body: { playerId: guestId } });
  logTest('Rooms', 'POST /api/rooms/:code/leave succeeds', leaveRoom.status === 200 && leaveRoom.data?.success);

  // Host leaves room -> room deleted
  const deleteRoom = await request(`/api/rooms/${roomCode}/leave`, { method: 'POST', body: { playerId: hostId } });
  logTest('Rooms', 'Host leaving room triggers cleanup', deleteRoom.status === 200);

  const checkDeleted = await request(`/api/rooms/${roomCode}`);
  logTest('Rooms', 'Deleted room no longer found (returns 404)', checkDeleted.status === 404);

  // ==========================================
  // 7. MATCHES & COMPETITIVE DUELS
  // ==========================================
  console.log('\n--- 7. Matches Subsystem ---');
  // Ranked / Private Match with Auth
  const createRankedMatch = await request('/api/matches', { 
    method: 'POST', 
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { type: 'private' }
  });
  logTest('Matches', 'Create authenticated private match returns 201 with roomCode', createRankedMatch.status === 201 && createRankedMatch.data?.match?.roomCode);
  const matchAId = createRankedMatch.data?.match?.id || createRankedMatch.data?.match?._id;
  const matchARoomCode = createRankedMatch.data?.match?.roomCode;

  // User B joins match
  const joinMatchB = await request('/api/matches/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { roomCode: matchARoomCode }
  });
  logTest('Matches', 'User B joins match via roomCode', joinMatchB.status === 200 && joinMatchB.data?.match?.status === 'MATCHED');

  // Inspect match details
  const getMatchA = await request(`/api/matches/${matchAId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  logTest('Matches', 'Participant A retrieves match details', getMatchA.status === 200 && getMatchA.data?.match);

  // Start match
  const startMatchA = await request(`/api/matches/${matchAId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  logTest('Matches', 'Start match updates status to ACTIVE', startMatchA.status === 200 && startMatchA.data?.match?.status === 'ACTIVE');

  // ==========================================
  // 8. CODE SUBMISSIONS & EVALUATION
  // ==========================================
  console.log('\n--- 8. Code Submissions & Evaluation ---');
  // Problem ID from match or problems list
  const activeProbId = firstProblemId || createRankedMatch.data?.match?.problems?.[0] || '1';

  // Valid JavaScript submission
  const jsSubmission = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      matchId: matchAId,
      problemId: activeProbId,
      code: 'function search(nums, target) { return nums.indexOf(target); }',
      language: 'javascript'
    }
  });
  logTest('Submissions', 'Valid JS submission judged and returns status 200', 
    jsSubmission.status === 200 && Boolean(jsSubmission.data?.data?.status || jsSubmission.data?.data?.submission?.status)
  );

  // Valid Python submission
  const pySubmission = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      matchId: matchAId,
      problemId: activeProbId,
      code: 'def search(nums, target):\n    return nums.index(target) if target in nums else -1',
      language: 'python'
    }
  });
  logTest('Submissions', 'Valid Python submission judged and returns status 200', 
    pySubmission.status === 200 && Boolean(pySubmission.data?.data?.status || pySubmission.data?.data?.submission?.status)
  );

  // Empty code validation
  const emptyCode = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      matchId: matchAId,
      problemId: activeProbId,
      code: '',
      language: 'javascript'
    }
  });
  logTest('Submissions', 'Empty code submission rejected with 400', emptyCode.status === 400);

  // Invalid language validation
  const badLang = await request('/api/submissions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      matchId: matchAId,
      problemId: activeProbId,
      code: 'main() {}',
      language: 'unsupported_lang'
    }
  });
  logTest('Submissions', 'Unsupported language rejected with 400', badLang.status === 400);

  // Get submissions by match
  const matchSubs = await request(`/api/submissions/match/${matchAId}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  logTest('Submissions', 'GET /api/submissions/match/:matchId returns submission records', matchSubs.status === 200 && Array.isArray(matchSubs.data?.data?.submissions));

  // Frontend Scrimmage Match (Unauthenticated contract from api.js)
  console.log('\n--- 7b. Scrimmages & Match Completion ---');
  const scrimmageRes = await request('/api/matches/create', {
    method: 'POST',
    body: {
      roomCode: 'CD-8492',
      player1: { id: hostId, name: hostName },
      player2: { id: guestId, name: guestName },
      questions: problems.slice(0, 2)
    }
  });
  logTest('Matches', 'Frontend unauthenticated match creation succeeds (status 201)', scrimmageRes.status === 201 && scrimmageRes.data?.match?.id);
  const scrimmageId = scrimmageRes.data?.match?.id;

  // Scrimmage progress update
  const progressRes = await request(`/api/matches/${scrimmageId}/progress`, {
    method: 'POST',
    body: {
      playerId: hostId,
      questionIndex: 0,
      time: 65
    }
  });
  logTest('Matches', 'Frontend scrimmage progress update succeeds', progressRes.status === 200 && progressRes.data?.match?.players[0]?.solved?.includes(0));

  // Scrimmage completion with custom winner and scores
  const completeScrimmage = await request(`/api/matches/${scrimmageId}/complete`, {
    method: 'POST',
    body: {
      winner: hostId,
      scores: { [hostId]: 100, [guestId]: 40 }
    }
  });
  logTest('Matches', 'Frontend scrimmage completion with custom scores succeeds', completeScrimmage.status === 200 && completeScrimmage.data?.match?.winner === hostId);

  // Server-evaluated match completion for ranked match
  const completeRanked = await request(`/api/matches/${matchAId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  logTest('Matches', 'Server-evaluated ranked match completion succeeds', completeRanked.status === 200 && completeRanked.data?.match?.status === 'COMPLETED');

  // ==========================================
  // 9. PLAYER PROFILES
  // ==========================================
  console.log('\n--- 9. Player Profiles Subsystem ---');
  const pId = `cadet_${stamp}`;
  const regPlayer = await request('/api/players/register', {
    method: 'POST',
    body: { id: pId, name: 'Valkyrie_99', rating: 2150 }
  });
  logTest('Players', 'POST /api/players/register registers player and returns profile', regPlayer.status === 200 && regPlayer.data?.player?.name === 'Valkyrie_99');

  const getPlayer = await request(`/api/players/${pId}`);
  logTest('Players', 'GET /api/players/:id retrieves player profile', getPlayer.status === 200 && getPlayer.data?.player?.rating === 2150);

  const getMissingPlayer = await request('/api/players/non_existent_player_xyz');
  logTest('Players', 'GET /api/players/:id with nonexistent ID returns 404', getMissingPlayer.status === 404);

  const badPlayerReg = await request('/api/players/register', { method: 'POST', body: { rating: 1500 } });
  logTest('Players', 'POST /api/players/register missing id or name rejected with 400', badPlayerReg.status === 400);

  // ==========================================
  // SUMMARY REPORT
  // ==========================================
  console.log('\n===============================================================');
  console.log('  📊 TEST RESULTS SUMMARY');
  console.log('===============================================================');
  console.log(`  Total Assertions Tested: ${results.total}`);
  console.log(`  Passed: \x1b[32m${results.passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${results.failed}\x1b[0m`);
  console.log(`  Pass Rate: \x1b[32m${((results.passed / results.total) * 100).toFixed(1)}%\x1b[0m`);
  console.log('---------------------------------------------------------------');
  for (const [cat, counts] of Object.entries(results.categories)) {
    const rate = ((counts.passed / (counts.passed + counts.failed)) * 100).toFixed(0);
    console.log(`  • ${cat.padEnd(16)}: ${counts.passed} passed, ${counts.failed} failed (${rate}%)`);
  }
  console.log('===============================================================\n');

  if (results.failed > 0) {
    console.error('Failed test details:');
    console.error(results.failures);
    process.exit(1);
  }
}

runExhaustiveSuite().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
