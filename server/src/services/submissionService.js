import { isMongoConnected } from '../config/database.js';
import Submission from '../models/Submission.js';
import Match from '../models/Match.js';
import { inMemoryStore } from './inMemoryStore.js';

// ============== CODE JUDGE (MOCK) ==============
// In production, this would call a code execution service like Judge0
// For now, we simulate judging with simple heuristics

export async function judgeCode(code, language, testCases) {
  // Mock code execution - replace with real judge integration
  const startTime = Date.now();
  
  // Simulate execution time
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  const executionTime = Date.now() - startTime;
  
  // Simulate test results based on code content
  // In reality, this would execute the code against test cases
  const hasValidReturn = /return|console\.log|print/.test(code);
  const hasFunction = /function|def |=>|class/.test(code);
  
  const safeTestCases = Array.isArray(testCases) ? testCases : [];
  
  const testResults = safeTestCases.map((tc, i) => {
    // Mock: 70% pass rate if code looks valid, otherwise failing
    const passed = hasValidReturn && hasFunction && Math.random() > 0.3;
    return {
      testCaseId: tc.id || tc._id || `tc-${i}`,
      passed,
      input: tc.input || '',
      expectedOutput: tc.expectedOutput || '',
      actualOutput: passed ? (tc.expectedOutput || '') : 'Wrong output',
      error: passed ? null : 'Output mismatch'
    };
  });
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length || 1;
  
  let status = 'Wrong Answer';
  if (passedTests === totalTests && totalTests > 0) {
    status = 'Accepted';
  } else if (!code.includes('return') && !code.includes('console.log')) {
    status = 'Runtime Error';
  } else if (executionTime > 5000) {
    status = 'Timeout';
  } else if (!hasFunction) {
    status = 'Compilation Error';
  }
  
  return {
    status,
    passedTests,
    totalTests,
    executionTime,
    testResults,
    errorMessage: status !== 'Accepted' ? status : null
  };
}

// ============== SUBMIT CODE ==============

export async function submitCode({ userId, matchId, problemId, code, language }) {
  // Verify match exists and user is in it
  let match;
  if (isMongoConnected()) {
    match = await Match.findById(matchId);
  } else {
    match = inMemoryStore.getMatch(matchId);
  }
  
  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    err.code = 'MATCH_NOT_FOUND';
    throw err;
  }
  
  // Verify user is in this match
  const playerIndex = match.players.findIndex(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (playerIndex === -1) {
    const err = new Error('Not a participant in this match');
    err.statusCode = 403;
    err.code = 'NOT_PARTICIPANT';
    throw err;
  }
  
  if (match.status !== 'ACTIVE') {
    const err = new Error('Match is not active');
    err.statusCode = 400;
    err.code = 'MATCH_NOT_ACTIVE';
    throw err;
  }
  
  // Get problem test cases from database or in-memory store
  let testCases;
  if (isMongoConnected()) {
    const TestCase = (await import('../models/TestCase.js')).default;
    testCases = await TestCase.find({ problemId }).sort({ order: 1 });
    if (!testCases || testCases.length === 0) {
      // Fallback to sample test cases if no DB test cases exist
      testCases = [
        { id: '1', input: 'test1', expectedOutput: 'output1' },
        { id: '2', input: 'test2', expectedOutput: 'output2' },
        { id: '3', input: 'test3', expectedOutput: 'output3' }
      ];
    }
  } else {
    const TestCase = (await import('../models/TestCase.js')).default;
    try {
      testCases = await TestCase.find({ problemId }).sort({ order: 1 });
    } catch {
      testCases = [
        { id: '1', input: 'test1', expectedOutput: 'output1' },
        { id: '2', input: 'test2', expectedOutput: 'output2' },
        { id: '3', input: 'test3', expectedOutput: 'output3' }
      ];
    }
  }
  
  // Judge the code
  const result = await judgeCode(code, language, testCases);
  
  // Calculate time from match start
  const timeFromStart = match.startedAt 
    ? Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000)
    : 0;
  
  // Save submission
  let submission;
  if (isMongoConnected()) {
    submission = new Submission({
      userId,
      matchId,
      problemId,
      code,
      language,
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      executionTime: result.executionTime,
      testResults: result.testResults,
      errorMessage: result.errorMessage,
      timeFromStart
    });
    await submission.save();
  } else {
    submission = inMemoryStore.createSubmission({
      userId,
      matchId,
      problemId,
      code,
      language,
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      executionTime: result.executionTime,
      testResults: result.testResults,
      errorMessage: result.errorMessage,
      timeFromStart
    });
  }
  
  // Update player progress if Accepted
  if (result.status === 'Accepted' && result.passedTests === result.totalTests) {
    const player = match.players[playerIndex];
    
    // Check if problem already solved
    const problemResults = player.problemResults || [];
    const alreadySolved = problemResults.some(pr => 
      pr.problemId.toString() === problemId.toString() && pr.solved
    );
    
    if (!alreadySolved) {
      const newResult = {
        problemId,
        solved: true,
        time: timeFromStart,
        attempts: 1,
        score: 100
      };
      
      problemResults.push(newResult);
      
      player.problemResults = problemResults;
      player.problemsSolved = problemResults.filter(pr => pr.solved).length;
      player.submissions = (player.submissions || 0) + 1;
      
      // Calculate total time (sum of all solved problem times)
      player.totalTime = problemResults
        .filter(pr => pr.solved)
        .reduce((sum, pr) => sum + pr.time, 0);
    } else {
      // Update attempts but don't add new solve
      const pr = problemResults.find(p => p.problemId.toString() === problemId.toString());
      if (pr) pr.attempts = (pr.attempts || 0) + 1;
    }
    
    // Save match atomically
    if (isMongoConnected()) {
      const updateOps = {
        $set: {
          [`players.${playerIndex}.problemsSolved`]: player.problemsSolved,
          [`players.${playerIndex}.totalTime`]: player.totalTime,
          [`players.${playerIndex}.submissions`]: player.submissions,
          [`players.${playerIndex}.problemResults`]: player.problemResults
        }
      };
      await Match.findOneAndUpdate({ _id: match._id }, updateOps);
    } else {
      // In-memory: save the mutated match object
      inMemoryStore.updateMatch(match.id || match._id, match);
    }
  } else {
    // Just increment submissions count
    match.players[playerIndex].submissions = 
      (match.players[playerIndex].submissions || 0) + 1;
    
    if (isMongoConnected()) {
      await Match.findOneAndUpdate(
        { _id: match._id },
        { $set: { [`players.${playerIndex}.submissions`]: match.players[playerIndex].submissions } }
      );
    } else {
      inMemoryStore.updateMatch(match.id || match._id, match);
    }
  }
  
  return {
    submission: {
      id: submission._id || submission.id,
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      executionTime: result.executionTime,
      testResults: result.testResults,
      errorMessage: result.errorMessage
    },
    matchProgress: {
      problemsSolved: match.players[playerIndex].problemsSolved,
      totalTime: match.players[playerIndex].totalTime
    }
  };
}

export async function getSubmissionsByMatch(matchId, userId) {
  if (isMongoConnected()) {
    return await Submission.find({ matchId, userId }).sort({ createdAt: -1 });
  } else {
    return inMemoryStore.getSubmissionsByMatch(matchId)
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export default { submitCode, getSubmissionsByMatch, judgeCode };
