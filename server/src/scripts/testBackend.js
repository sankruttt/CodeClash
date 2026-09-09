// Comprehensive backend test script
const BASE_URL = 'http://localhost:3001';

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message, type = 'info') {
  const colors = {
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function recordTest(name, passed, error = null) {
  if (passed) {
    testResults.passed++;
    log(`✓ PASS: ${name}`, 'pass');
  } else {
    testResults.failed++;
    testResults.errors.push({ test: name, error });
    log(`✗ FAIL: ${name}`, 'fail');
    if (error) log(`  Error: ${error}`, 'fail');
  }
}

async function testRequest(name, method, endpoint, body = null, headers = {}, expectedStatus = 200) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { raw: await response.text() };
    }
    
    if (response.status === expectedStatus) {
      recordTest(name, true);
      return data;
    } else {
      recordTest(name, false, `Expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    recordTest(name, false, error.message);
    return null;
  }
}

async function runTests() {
  log('\n═══════════════════════════════════════════', 'info');
  log('  🧪 CodeClash Backend Comprehensive Test', 'info');
  log('═══════════════════════════════════════════\n', 'info');
  
  // ============== HEALTH & BASIC ==============
  log('📡 Testing Health & Basic Endpoints...', 'info');
  const health = await testRequest('Health Check', 'GET', '/api/health');
  if (health) log(`  Database: ${health.database}`, 'info');
  
  await testRequest('Root Endpoint', 'GET', '/');
  
  // ============== AUTHENTICATION ==============
  log('\n🔐 Testing Authentication...', 'info');
  
  // Test login with existing user
  const loginData = await testRequest('Login - Valid Credentials', 'POST', '/api/auth/login', {
    email: 'alice@codeclash.com',
    password: 'Alice123'
  });
  
  const token1 = loginData?.data?.token;
  const user1Id = loginData?.data?.user?.id;
  
  // Test login with invalid credentials
  await testRequest('Login - Invalid Password', 'POST', '/api/auth/login', {
    email: 'alice@codeclash.com',
    password: 'WrongPassword'
  }, {}, 401);
  
  // Test login with non-existent user
  await testRequest('Login - Non-existent User', 'POST', '/api/auth/login', {
    email: 'nonexistent@test.com',
    password: 'Test1234'
  }, {}, 401);
  
  // Test registration with valid data
  const newUser = `testuser${Date.now()}`;
  const regData = await testRequest('Registration - Valid Data', 'POST', '/api/auth/register', {
    username: newUser,
    email: `${newUser}@test.com`,
    password: 'Test1234'
  }, {}, 201);
  const tokenNew = regData?.data?.token;
  
  // Test registration with duplicate email
  await testRequest('Registration - Duplicate Email', 'POST', '/api/auth/register', {
    username: 'another',
    email: 'alice@codeclash.com',
    password: 'Test1234'
  }, {}, 409);
  
  // Test registration with weak password
  await testRequest('Registration - Weak Password', 'POST', '/api/auth/register', {
    username: 'weakuser',
    email: 'weak@test.com',
    password: 'weak'
  }, {}, 400);
  
  // Test registration with invalid email
  await testRequest('Registration - Invalid Email', 'POST', '/api/auth/register', {
    username: 'invaliduser',
    email: 'not-an-email',
    password: 'Test1234'
  }, {}, 400);
  
  // Test get profile with token
  await testRequest('Get Profile - Authenticated', 'GET', '/api/auth/me', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  // Test get profile without token
  await testRequest('Get Profile - No Token', 'GET', '/api/auth/me', null, {}, 401);
  
  // Test get profile with invalid token
  await testRequest('Get Profile - Invalid Token', 'GET', '/api/auth/me', null, {
    'Authorization': 'Bearer invalid_token_here'
  }, 401);
  
  // ============== PROBLEMS ==============
  log('\n📝 Testing Problems...', 'info');
  
  const problemsData = await testRequest('Get All Problems', 'GET', '/api/problems', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  await testRequest('Get Random Problems', 'GET', '/api/problems/random?count=3', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  if (problemsData?.data?.problems?.length > 0) {
    const firstProblemId = problemsData.data.problems[0].id;
    await testRequest('Get Problem by ID', 'GET', `/api/problems/${firstProblemId}`, null, {
      'Authorization': `Bearer ${token1}`
    });
  }
  
  // ============== LEADERBOARD ==============
  log('\n🏆 Testing Leaderboard...', 'info');
  
  await testRequest('Get Leaderboard', 'GET', '/api/leaderboard', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  await testRequest('Get Leaderboard - Sorted by Wins', 'GET', '/api/leaderboard?sortBy=wins', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  await testRequest('Get Match History', 'GET', '/api/leaderboard/history/me', null, {
    'Authorization': `Bearer ${token1}`
  });
  
  if (user1Id) {
    await testRequest('Get User Rank', 'GET', `/api/leaderboard/rank/${user1Id}`, null, {
      'Authorization': `Bearer ${token1}`
    });
  }
  
  // ============== MATCHES ==============
  log('\n🎮 Testing Matches...', 'info');
  
  // Login as second user for match testing
  const login2 = await testRequest('Login - Second User', 'POST', '/api/auth/login', {
    email: 'bob@codeclash.com',
    password: 'Bob12345'
  });
  const token2 = login2?.data?.token;
  const user2Id = login2?.data?.user?.id;
  
  // Create a match
  const matchData = await testRequest('Create Match', 'POST', '/api/matches', {
    type: 'private'
  }, {
    'Authorization': `Bearer ${token1}`
  }, 201);
  
  const matchId = matchData?.data?.match?.id || matchData?.data?.match?._id;
  const roomCode = matchData?.data?.match?.roomCode;
  
  if (roomCode) {
    // Join the match with second user
    await testRequest('Join Match', 'POST', '/api/matches/join', {
      roomCode: roomCode
    }, {
      'Authorization': `Bearer ${token2}`
    });
    
    // Try to join with invalid room code
    await testRequest('Join Match - Invalid Code', 'POST', '/api/matches/join', {
      roomCode: 'INVALID'
    }, {
      'Authorization': `Bearer ${token2}`
    }, 404);
  }
  
  if (matchId) {
    // Get match details
    await testRequest('Get Match Details', 'GET', `/api/matches/${matchId}`, null, {
      'Authorization': `Bearer ${token1}`
    });
    
    // Get match by code
    if (roomCode) {
      await testRequest('Get Match by Code', 'GET', `/api/matches/by-code/${roomCode}`, null, {
        'Authorization': `Bearer ${token1}`
      });
    }
    
    // Start the match
    await testRequest('Start Match', 'POST', `/api/matches/${matchId}/start`, null, {
      'Authorization': `Bearer ${token1}`
    });
  }
  
  // ============== SUBMISSIONS ==============
  log('\n💻 Testing Code Submissions...', 'info');
  
  if (matchId && problemsData?.data?.problems?.length > 0) {
    const problemId = problemsData.data.problems[0].id;
    
    // Submit valid code
    await testRequest('Submit Code - Valid', 'POST', '/api/submissions', {
      matchId: matchId,
      problemId: problemId,
      code: 'function solution() { return nums.indexOf(target); }',
      language: 'javascript'
    }, {
      'Authorization': `Bearer ${token1}`
    });
    
    // Submit with empty code
    await testRequest('Submit Code - Empty Code', 'POST', '/api/submissions', {
      matchId: matchId,
      problemId: problemId,
      code: '',
      language: 'javascript'
    }, {
      'Authorization': `Bearer ${token1}`
    }, 400);
    
    // Submit with invalid language
    await testRequest('Submit Code - Invalid Language', 'POST', '/api/submissions', {
      matchId: matchId,
      problemId: problemId,
      code: 'test',
      language: 'cobol'
    }, {
      'Authorization': `Bearer ${token1}`
    }, 400);
    
    // Get submissions for match
    await testRequest('Get Match Submissions', 'GET', `/api/submissions/match/${matchId}`, null, {
      'Authorization': `Bearer ${token1}`
    });
  }
  
  // ============== MATCHMAKING ==============
  log('\n🎯 Testing Matchmaking...', 'info');
  
  // Join matchmaking queue
  const queueData = await testRequest('Join Matchmaking', 'POST', '/api/matchmaking/join', null, {
    'Authorization': `Bearer ${tokenNew}`
  });
  
  // Try to join again (should fail)
  await testRequest('Join Matchmaking - Duplicate', 'POST', '/api/matchmaking/join', null, {
    'Authorization': `Bearer ${tokenNew}`
  }, 409);
  
  // Get queue status
  await testRequest('Get Matchmaking Status', 'GET', '/api/matchmaking/status', null, {
    'Authorization': `Bearer ${tokenNew}`
  });
  
  // Leave queue
  await testRequest('Leave Matchmaking', 'POST', '/api/matchmaking/leave', null, {
    'Authorization': `Bearer ${tokenNew}`
  });
  
  // ============== COMPLETE MATCH ==============
  log('\n🏁 Testing Match Completion...', 'info');
  
  if (matchId) {
    await testRequest('Complete Match', 'POST', `/api/matches/${matchId}/complete`, null, {
      'Authorization': `Bearer ${token1}`
    });
  }
  
  // ============== FINAL REPORT ==============
  log('\n═══════════════════════════════════════════', 'info');
  log('  📊 Test Results', 'info');
  log('═══════════════════════════════════════════', 'info');
  log(`  ✅ Passed: ${testResults.passed}`, 'pass');
  log(`  ❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'fail' : 'pass');
  log(`  📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`, 'info');
  
  if (testResults.errors.length > 0) {
    log('\n═══════════════════════════════════════════', 'fail');
    log('  ❌ Failed Tests Details', 'fail');
    log('═══════════════════════════════════════════\n', 'fail');
    
    testResults.errors.forEach((err, i) => {
      log(`${i + 1}. ${err.test}`, 'fail');
      log(`   ${err.error}\n`, 'fail');
    });
  } else {
    log('\n🎉 All tests passed!\n', 'pass');
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log('\n💥 Test suite crashed:', 'fail');
  console.error(err);
  process.exit(1);
});
