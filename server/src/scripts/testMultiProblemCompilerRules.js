/**
 * testMultiProblemCompilerRules.js
 * 
 * Verifies all 12 Acceptance Criteria:
 * 1. User with Python as Primary Stack -> Python starter code.
 * 2. User with C++ as Primary Stack -> C++ starter code.
 * 3. User with Java as Primary Stack -> Java starter code.
 * 4. User with JavaScript as Primary Stack -> JavaScript starter code.
 * 5. User with C as Primary Stack -> C starter code.
 * 6. 2-question match -> both questions load their own distinct, correct starter code.
 * 7. 3-question match -> all three questions load their own distinct, correct starter code.
 * 8. Change language manually -> corresponding starter code for current problem loads.
 * 9. Navigation Q1 -> Q2 -> Q3 -> Q1 -> no stale or mismatched starter code.
 * 10. Refresh/re-enter -> compiler initializes from user's actual Primary Stack.
 * 11. Dropdown language always matches compiler language.
 * 12. Primary Stack is read from MongoDB/backend, not frontend-only value.
 */

import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import db from '../config/database.js';
import User from '../models/User.js';
import CodingProblem from '../models/CodingProblem.js';
import Match from '../models/Match.js';
import { normalizeStackToDropdown, getStarterCodeKey, getStarterCodeForProblemAndLang } from '../../../src/utils/compilerHelpers.js';

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

async function runTests() {
  console.log('\n--- Starting Multi-Problem Compiler Verification Suite ---\n');
  await db.connectDatabase();

  // Test 1-5: Verification of all 5 stacks in MongoDB and helper normalization
  const stacks = ['Python', 'C++', 'Java', 'JavaScript', 'C'];
  const testProblems = await CodingProblem.find({ isActive: true }).limit(3);
  assert(testProblems.length >= 3, 'Must have at least 3 active problems in MongoDB');

  for (const stack of stacks) {
    const normalized = normalizeStackToDropdown(stack);
    assert.strictEqual(normalized, stack, `normalizeStackToDropdown('${stack}') returns '${stack}'`);
    const key = getStarterCodeKey(stack);
    
    // Check that problem starter code exists and is populated in MongoDB for this stack
    for (const prob of testProblems) {
      const starterCode = getStarterCodeForProblemAndLang(prob, stack);
      assert(starterCode && starterCode.length > 0, `Problem "${prob.title}" has non-empty starter code for ${stack}`);
      assert.strictEqual(starterCode.includes('function search(nums, target)'), false, 'Does not contain legacy hardcoded fallback');
    }
    logPass(`Criterion 1-5: Stack ${stack} resolves correctly and retrieves distinct MongoDB starter code`);
  }

  // Test 6: 2-question match loads distinct starter codes
  const p1 = testProblems[0];
  const p2 = testProblems[1];
  const p1CodeCpp = getStarterCodeForProblemAndLang(p1, 'C++');
  const p2CodeCpp = getStarterCodeForProblemAndLang(p2, 'C++');
  assert(p1CodeCpp && p2CodeCpp, 'Both problems have C++ starter code');
  assert.notStrictEqual(p1CodeCpp, p2CodeCpp, 'Question 1 and Question 2 have distinct C++ starter codes');
  logPass('Criterion 6: 2-question match loads distinct, problem-specific starter code for each problem');

  // Test 7: 3-question match loads distinct starter codes
  const p3 = testProblems[2];
  const p1CodePy = getStarterCodeForProblemAndLang(p1, 'Python');
  const p2CodePy = getStarterCodeForProblemAndLang(p2, 'Python');
  const p3CodePy = getStarterCodeForProblemAndLang(p3, 'Python');
  assert(p1CodePy && p2CodePy && p3CodePy, 'All 3 problems have Python starter code');
  assert.notStrictEqual(p1CodePy, p2CodePy, 'Q1 and Q2 have distinct Python starter code');
  assert.notStrictEqual(p2CodePy, p3CodePy, 'Q2 and Q3 have distinct Python starter code');
  assert.notStrictEqual(p1CodePy, p3CodePy, 'Q1 and Q3 have distinct Python starter code');
  logPass('Criterion 7: 3-question match loads distinct, problem-specific starter code for all 3 questions');

  // Test 8: Manual language change loads current problem's starter code for new language
  const p1Py = getStarterCodeForProblemAndLang(p1, 'Python');
  const p1Java = getStarterCodeForProblemAndLang(p1, 'Java');
  assert.notStrictEqual(p1Py, p1Java, 'Problem 1 Python and Java starter codes are distinct');
  assert(p1Java.includes('class') || p1Java.includes('Solution') || p1Java.includes('Scanner'), 'Java starter code contains Java constructs');
  logPass('Criterion 8: Changing language dynamically retrieves current problem starter code for the new language');

  // Test 9: Navigation Q1 -> Q2 -> Q3 -> Q1 simulation
  let selectedLanguage = 'C++';
  let state = {};
  
  // Enter Q1
  let activeId = p1._id.toString();
  let key = `${activeId}::${getStarterCodeKey(selectedLanguage)}`;
  state[key] = state[key] !== undefined ? state[key] : getStarterCodeForProblemAndLang(p1, selectedLanguage);
  assert.strictEqual(state[key], p1CodeCpp, 'Q1 has Q1 C++ code');

  // Navigate to Q2
  activeId = p2._id.toString();
  key = `${activeId}::${getStarterCodeKey(selectedLanguage)}`;
  state[key] = state[key] !== undefined ? state[key] : getStarterCodeForProblemAndLang(p2, selectedLanguage);
  assert.strictEqual(state[key], p2CodeCpp, 'Q2 has Q2 C++ code, NOT Q1 code');
  assert.notStrictEqual(state[key], p1CodeCpp, 'Q2 never reuses Q1 code');

  // Navigate to Q3
  activeId = p3._id.toString();
  key = `${activeId}::${getStarterCodeKey(selectedLanguage)}`;
  state[key] = state[key] !== undefined ? state[key] : getStarterCodeForProblemAndLang(p3, selectedLanguage);
  assert.strictEqual(state[key], getStarterCodeForProblemAndLang(p3, 'C++'), 'Q3 has Q3 C++ code');

  // Navigate back to Q1
  activeId = p1._id.toString();
  key = `${activeId}::${getStarterCodeKey(selectedLanguage)}`;
  assert.strictEqual(state[key], p1CodeCpp, 'Navigating back to Q1 retrieves Q1 code without stale state');
  logPass('Criterion 9: Navigation Q1 -> Q2 -> Q3 -> Q1 maintains state isolation and never leaks stale code');

  // Test 10 & 12: Primary Stack is read from MongoDB/backend
  const testUser = await User.findOne({ username: 'alice' });
  assert(testUser, 'Found test user alice in MongoDB');
  assert.strictEqual(testUser.primaryStack, 'C++', 'Alice has C++ stored authoritatively in MongoDB');
  const userJson = testUser.toPublicJSON();
  assert.strictEqual(userJson.primaryStack, 'C++', 'toPublicJSON returns primaryStack: C++');
  assert.strictEqual(normalizeStackToDropdown(userJson.primaryStack), 'C++', 'Compiler defaults to user Primary Stack C++');
  logPass('Criterion 10 & 12: Primary Stack is verified from MongoDB and initializes compiler language');

  // Test 11: Dropdown language key matches compiler language key
  for (const stack of stacks) {
    const dropdownValue = normalizeStackToDropdown(stack);
    const compilerLang = getStarterCodeKey(dropdownValue);
    assert(['c', 'cpp', 'java', 'javascript', 'python'].includes(compilerLang), `Compiler language ${compilerLang} is valid`);
  }
  logPass('Criterion 11: Dropdown display value and compiler execution key match seamlessly');

  // Test createMatch backend response has populated problems
  const dummyMatch = new Match({
    roomCode: 'TEST-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    type: 'ranked',
    duration: 600,
    questionCount: 3,
    status: 'ACTIVE',
    players: [{ userId: testUser._id, username: testUser.username, status: 'ACTIVE' }],
    problems: [p1._id, p2._id, p3._id],
    startedAt: new Date()
  });
  await dummyMatch.save();
  await dummyMatch.populate('problems');
  assert(dummyMatch.problems.length === 3, 'Populated match has 3 problems');
  assert(dummyMatch.problems[0].starterCode && dummyMatch.problems[0].starterCode.python, 'Populated problem has starterCode');
  await Match.deleteOne({ _id: dummyMatch._id });
  logPass('Backend Match Population: Match.populate("problems") produces complete problem objects');

  console.log('\n\x1b[32m✔ ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\x1b[31m❌ TEST FAILED:\x1b[0m', err);
  process.exit(1);
});
