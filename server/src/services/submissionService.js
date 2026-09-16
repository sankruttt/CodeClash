import { isMongoConnected } from '../config/database.js';
import Submission from '../models/Submission.js';
import Match from '../models/Match.js';
import { inMemoryStore } from './inMemoryStore.js';
import { executeCode } from './compilerService.js';

// ============== CODE JUDGE ==============
export async function judgeCode(code, language, testCases) {
  return await executeCode({ code, language, testCases });
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
