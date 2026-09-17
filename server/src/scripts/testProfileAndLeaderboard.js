import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';

const API_BASE = 'http://localhost:3001/api';

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Testing Leaderboard Clan Tag Removal & Profile Edit API');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Setup test users in MongoDB
    const testUserA = await User.findOneAndUpdate(
      { email: 'test_duelist_a@codeclash.io' },
      {
        username: 'test_duelist_a',
        name: 'Duelist Alpha',
        email: 'test_duelist_a@codeclash.io',
        password: '$2a$12$eXampleHashedPasswordForTesting1234567890',
        rating: 1800,
        wins: 15,
        losses: 5,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const testUserB = await User.findOneAndUpdate(
      { email: 'test_duelist_b@codeclash.io' },
      {
        username: 'test_duelist_b',
        name: 'Duelist Beta',
        email: 'test_duelist_b@codeclash.io',
        password: '$2a$12$eXampleHashedPasswordForTesting1234567890',
        rating: 1750,
        wins: 12,
        losses: 8,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const tokenA = jwt.sign(
      { id: testUserA._id, username: testUserA.username, email: testUserA.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('--- Test 1: Unauthenticated Profile Update ---');
    const res1 = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Name' }),
    });
    assert(res1.status === 401, 'Rejects update without auth token (401)');

    console.log('\n--- Test 2: Validation on Empty / Invalid Fields ---');
    const res2EmptyName = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: '   ' }),
    });
    assert(res2EmptyName.status === 400, 'Rejects empty name (400)');

    const res2EmptyUser = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ username: '' }),
    });
    assert(res2EmptyUser.status === 400, 'Rejects empty username (400)');

    const res2BadUser = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ username: 'bad user with spaces!' }),
    });
    assert(res2BadUser.status === 400, 'Rejects invalid characters in username (400)');

    console.log('\n--- Test 3: Username Uniqueness & Conflict Handling ---');
    const res3Conflict = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ username: 'test_duelist_b' }), // user B's username
    });
    const conflictData = await res3Conflict.json();
    assert(res3Conflict.status === 409, 'Returns 409 when username is taken by another user');
    assert(
      conflictData.message === 'Username is already taken' || conflictData.error === 'USERNAME_TAKEN',
      'Returns clear validation message for duplicate username'
    );

    // Same username unchanged
    const res3SameUser = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ username: 'test_duelist_a', name: 'Alpha Renovated' }),
    });
    assert(res3SameUser.status === 200, 'Does NOT conflict with current user’s own username');
    const sameData = await res3SameUser.json();
    assert(sameData.data?.user?.name === 'Alpha Renovated', 'Name is updated when username is kept identical');

    console.log('\n--- Test 4: Protected Fields Immutability ---');
    const res4Protected = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Alpha Valid',
        rating: 99999,
        wins: 5000,
        email: 'hacked_email@danger.com',
        role: 'admin',
      }),
    });
    assert(res4Protected.status === 200, 'Accepts valid name while ignoring protected fields');
    const userInDb = await User.findById(testUserA._id);
    assert(userInDb.rating === 1800, 'Rating remains unchanged (protected)');
    assert(userInDb.wins === 15, 'Wins remain unchanged (protected)');
    assert(userInDb.email === 'test_duelist_a@codeclash.io', 'Email remains unchanged (protected)');

    console.log('\n--- Test 5: Full Successful Update with Token Issuance & PlayerStatistics Sync ---');
    const updatedUsername = 'alpha_apex_legend';
    const updatedName = 'Alpha Supreme Commander';
    const res5Success = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: updatedName,
        username: updatedUsername,
      }),
    });
    assert(res5Success.status === 200, 'Profile update returns 200 OK');
    const successData = await res5Success.json();
    assert(successData.data?.user?.username === updatedUsername, 'Returned user has updated username');
    assert(successData.data?.user?.name === updatedName, 'Returned user has updated name');
    assert(typeof successData.data?.token === 'string', 'Returned fresh valid JWT token');

    // Verify in MongoDB
    const checkUser = await User.findById(testUserA._id);
    assert(checkUser.username === updatedUsername, 'MongoDB User document has updated username');
    assert(checkUser.name === updatedName, 'MongoDB User document has updated name');

    const checkStats = await PlayerStatistics.findOne({ userId: testUserA._id });
    if (checkStats) {
      assert(checkStats.username === updatedUsername, 'MongoDB PlayerStatistics has synchronized username');
    } else {
      console.log('  (PlayerStatistics document was not pre-existing for test user)');
    }

    console.log('\n--- Test 6: Leaderboard API Reflects Updated Name & Has No Clan Tags ---');
    const res6Lb = await fetch(`${API_BASE}/leaderboard?page=1&limit=20`);
    const lbData = await res6Lb.json();
    assert(res6Lb.status === 200, 'Leaderboard API returns 200');
    assert(Array.isArray(lbData.data?.leaderboard), 'Leaderboard data is an array');

    const foundAlpha = lbData.data.leaderboard.find(
      (item) => String(item.userId) === String(testUserA._id) || String(item.id) === String(testUserA._id)
    );
    if (foundAlpha) {
      assert(foundAlpha.name === updatedName, `Leaderboard reflects updated combatant name (${foundAlpha.name})`);
      assert(foundAlpha.username === updatedUsername, `Leaderboard reflects updated username (${foundAlpha.username})`);
      assert(foundAlpha.clan === undefined, 'Leaderboard item does not contain hardcoded clan tag');
    } else {
      console.log('  Note: Test user ranked beyond page 1');
    }

    console.log('\n--- Test 7: GET /api/auth/me Rehydration ---');
    const res7Me = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${successData.data.token}` },
    });
    assert(res7Me.status === 200, '/api/auth/me succeeds with fresh token');
    const meData = await res7Me.json();
    assert(meData.data?.user?.name === updatedName, 'Rehydrated user profile has updated name');
    assert(meData.data?.user?.username === updatedUsername, 'Rehydrated user profile has updated username');

    // Cleanup test users
    await User.deleteMany({ email: { $in: ['test_duelist_a@codeclash.io', 'test_duelist_b@codeclash.io'] } });
    await PlayerStatistics.deleteMany({ userId: { $in: [testUserA._id, testUserB._id] } });
    console.log('\n🧹 Cleaned up temporary test users');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`Summary: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
