import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import { updatePlayerStatsAfterMatch } from '../services/scoringService.js';
import { getUserStreak } from '../services/streakService.js';

const API_BASE = 'http://localhost:3001/api';

async function runVerification() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Testing Streak Non-Negativity & Primary Stack Selection');
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

  const testEmail = `stack_test_${Date.now()}@codeclash.io`;
  const testUsername = `stack_user_${Date.now()}`;
  let testUser = null;

  try {
    // 1. Create a fresh test user
    testUser = await User.create({
      username: testUsername,
      name: 'Stack Tester',
      email: testEmail,
      password: '$2a$12$eXampleHashedPasswordForTesting1234567890',
      rating: 1500,
      primaryStack: 'Python',
      streak: 5,
      longestStreak: 10,
      wins: 10,
      losses: 2
    });

    const token = jwt.sign(
      { id: testUser._id, username: testUser.username, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('--- Test 1: Update Primary Stack to JavaScript ---');
    const res1 = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        primaryStack: 'JavaScript'
      })
    });
    assert(res1.status === 200, 'Profile update returns 200 OK');
    const data1 = await res1.json();
    assert(data1.data?.user?.primaryStack === 'JavaScript', 'Response contains primaryStack: JavaScript');

    const dbUser1 = await User.findById(testUser._id);
    assert(dbUser1.primaryStack === 'JavaScript', 'MongoDB User document has primaryStack: JavaScript');

    console.log('\n--- Test 2: Reject Invalid Primary Stack ---');
    const res2 = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        primaryStack: 'Rust' // Not in enum: ['C', 'C++', 'Java', 'JavaScript', 'Python']
      })
    });
    assert(res2.status === 400, 'Rejects unsupported language stack with 400 Bad Request');

    console.log('\n--- Test 3: Match Loss Does NOT Corrupt Daily Day Streak ---');
    // Simulate user losing a match
    const mockMatch = {
      _id: new mongoose.Types.ObjectId(),
      winner: new mongoose.Types.ObjectId(), // someone else won
      result: 'win'
    };
    const mockPlayerResult = {
      username: testUser.username,
      ratingAfter: 1485,
      ratingChange: -15,
      problemsSolved: 0,
      submissions: 1
    };
    await updatePlayerStatsAfterMatch(testUser._id, mockMatch, mockPlayerResult);

    const dbUserAfterLoss = await User.findById(testUser._id);
    assert(dbUserAfterLoss.streak >= 0, `User streak in DB is >= 0 (Actual: ${dbUserAfterLoss.streak})`);
    assert(dbUserAfterLoss.streak !== -1, 'User streak is NOT -1 after match defeat');

    // Check PlayerStatistics match streak (which may be negative -1) vs User daily streak
    const playerStats = await PlayerStatistics.findOne({ userId: testUser._id });
    if (playerStats) {
      console.log(`  PlayerStatistics match streak is ${playerStats.currentStreak}, while User.streak is ${dbUserAfterLoss.streak}`);
      assert(playerStats.currentStreak < 0, 'PlayerStatistics.currentStreak correctly tracks duel loss streak (-1)');
      assert(dbUserAfterLoss.streak >= 0, 'User.streak is decoupled from duel loss streak and remains non-negative');
    }

    console.log('\n--- Test 4: Leaderboard API Reflects Primary Stack & Clamped Streak ---');
    const resLb = await fetch(`${API_BASE}/leaderboard?page=1&limit=50`);
    const lbData = await resLb.json();
    assert(resLb.status === 200, 'Leaderboard API returns 200 OK');
    const foundUserInLb = lbData.data?.leaderboard?.find(
      (item) => String(item.userId) === String(testUser._id) || String(item.id) === String(testUser._id)
    );
    if (foundUserInLb) {
      assert(foundUserInLb.stack === 'JavaScript', `Leaderboard item reflects primaryStack: ${foundUserInLb.stack}`);
      assert(foundUserInLb.streak >= 0, `Leaderboard item streak is non-negative: ${foundUserInLb.streak}`);
    } else {
      console.log('  (User not in page 1, checking query with stackFilter)');
    }

    const resLbFilter = await fetch(`${API_BASE}/leaderboard?stack=JavaScript`);
    const lbFilterData = await resLbFilter.json();
    const foundInFilter = lbFilterData.data?.leaderboard?.find(
      (item) => String(item.userId) === String(testUser._id) || String(item.id) === String(testUser._id)
    );
    if (foundInFilter) {
      assert(foundInFilter.stack === 'JavaScript', 'Leaderboard stack filter matches updated primary stack');
    }

    console.log('\n--- Test 5: /api/auth/streak Telemetry API ---');
    const resStreak = await fetch(`${API_BASE}/auth/streak`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(resStreak.status === 200, '/api/auth/streak returns 200 OK');
    const streakJson = await resStreak.json();
    assert(streakJson.data?.streak >= 0, `Returned streak is non-negative: ${streakJson.data?.streak}`);
    assert(streakJson.data?.longestStreak >= 0, `Returned longestStreak is non-negative: ${streakJson.data?.longestStreak}`);

    console.log('\n--- Test 6: Database Scan for Any Remaining Negative Streaks ---');
    const anyNegative = await User.countDocuments({ streak: { $lt: 0 } });
    assert(anyNegative === 0, `Total users with streak < 0 in MongoDB is 0 (Actual: ${anyNegative})`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
      await PlayerStatistics.deleteOne({ userId: testUser._id });
    }
    await mongoose.disconnect();
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`Summary: Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
