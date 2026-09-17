import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import Match from '../models/Match.js';
import Room from '../models/Room.js';
import TestCase from '../models/TestCase.js';
import CodingProblem from '../models/CodingProblem.js';
import { executeCode } from './compilerService.js';
import { normalizeLanguage } from '../config/languages.js';

// ============== CODE JUDGE ==============
export async function judgeCode(code, language, testCases) {
  const canonicalLang = normalizeLanguage(language);
  return await executeCode({ code, language: canonicalLang, testCases });
}

// ============== SUBMIT CODE ==============

export async function submitCode({ userId, matchId, problemId, code, language }) {
  if (!code || typeof code !== 'string') {
    const err = new Error('Source code cannot be empty');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const canonicalLang = normalizeLanguage(language);

  // Validate problem exists
  let problem = null;
  if (mongoose.Types.ObjectId.isValid(problemId)) {
    problem = await CodingProblem.findById(problemId);
  }
  if (!problem) {
    problem = await CodingProblem.findOne({ title: problemId });
  }

  const validProblemId = problem ? problem._id : problemId;

  // Retrieve match from MongoDB
  let match = null;
  const cleanCode = String(matchId || '').replace(/^room_/i, '').toUpperCase();

  if (matchId) {
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      match = await Match.findById(matchId);
    }
    if (!match && cleanCode) {
      match = await Match.findOne({ roomCode: cleanCode });
    }
    if (!match && cleanCode) {
      const room = await Room.findOne({ code: cleanCode });
      if (room && room.matchId) {
        match = await Match.findById(room.matchId);
      }
    }
  }

  // If no match found in MongoDB, persist new Match document with unique roomCode
  if (!match) {
    const generatedCode = cleanCode && cleanCode.length <= 15
      ? cleanCode
      : `M${Date.now().toString(36).toUpperCase()}`;

    match = await Match.findOne({ roomCode: generatedCode });
    if (!match) {
      match = new Match({
        roomCode: generatedCode,
        type: 'casual',
        status: 'ACTIVE',
        problems: validProblemId ? [validProblemId] : [],
        players: [
          {
            userId: userId,
            username: 'Combatant',
            status: 'ACTIVE'
          }
        ]
      });
      await match.save();
    }
  }

  if (match.status === 'ABANDONED') {
    const err = new Error('Match has been abandoned and is no longer active');
    err.statusCode = 400;
    err.code = 'MATCH_ABANDONED';
    throw err;
  }

  if (match.status !== 'ACTIVE' && match.status !== 'in_progress') {
    match.status = 'ACTIVE';
    await match.save();
  }

  // Find or register player in match
  let playerIndex = match.players.findIndex(
    (p) => p.userId && String(p.userId) === String(userId)
  );

  if (playerIndex === -1) {
    match.players.push({
      userId,
      username: 'Combatant',
      status: 'ACTIVE'
    });
    playerIndex = match.players.length - 1;
    await match.save();
  }

  // Retrieve test cases from MongoDB
  let testCases = await TestCase.find({ problemId: validProblemId }).sort({ order: 1 });

  // If no separate test cases, use problem examples
  if ((!testCases || testCases.length === 0) && problem?.examples?.length > 0) {
    testCases = problem.examples.map((ex, idx) => ({
      id: `ex-${idx + 1}`,
      input: ex.input,
      expectedOutput: ex.output
    }));
  }

  // Judge code against test cases
  const result = await judgeCode(code, canonicalLang, testCases);

  const timeFromStart = match.startedAt
    ? Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000)
    : 0;

  // Persist submission to MongoDB
  const submission = new Submission({
    userId: userId || 'guest_user',
    matchId: match._id,
    problemId: validProblemId,
    code,
    language: canonicalLang,
    status: result.status,
    passedTests: result.passedTests,
    totalTests: result.totalTests,
    executionTime: result.executionTime,
    testResults: result.testResults,
    errorMessage: result.error,
    timeFromStart
  });

  await submission.save();

  // Update match player progress if participant found
  if (playerIndex !== -1) {
    const player = match.players[playerIndex];
    player.submissions = (player.submissions || 0) + 1;

    if (result.status === 'Accepted' && result.passedTests === result.totalTests) {
      player.problemResults = player.problemResults || [];
      const alreadySolved = player.problemResults.some(
        (pr) => pr.problemId && pr.problemId.toString() === validProblemId.toString() && pr.solved
      );

      if (!alreadySolved) {
        player.problemResults.push({
          problemId: validProblemId,
          solved: true,
          time: timeFromStart,
          attempts: 1,
          score: 100
        });

        player.problemsSolved = player.problemResults.filter((pr) => pr.solved).length;
        player.totalTime = player.problemResults
          .filter((pr) => pr.solved)
          .reduce((sum, pr) => sum + pr.time, 0);
      }
    }

    await match.save();
  }

  return {
    submission: {
      id: submission._id,
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      executionTime: result.executionTime,
      testResults: result.testResults,
      errorMessage: result.error
    },
    matchProgress: playerIndex !== -1 ? {
      problemsSolved: match.players[playerIndex].problemsSolved || 0,
      totalTime: match.players[playerIndex].totalTime || 0
    } : null
  };
}

export async function getSubmissionsByMatch(matchId, userId) {
  const query = {};
  if (mongoose.Types.ObjectId.isValid(matchId)) {
    query.matchId = matchId;
  }
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    query.userId = userId;
  }

  return await Submission.find(query).sort({ createdAt: -1 });
}

export default { submitCode, getSubmissionsByMatch, judgeCode };
