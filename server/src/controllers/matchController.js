import { v4 as uuidv4 } from 'uuid';
import Match from '../models/Match.js';
import {
  createPrivateMatch,
  joinMatch,
  startMatch,
  getMatchById,
  getMatchByRoomCode,
  completeMatch,
  abandonMatch
} from '../services/matchService.js';
import { updatePlayerStatsAfterMatch, addMatchHistory } from '../services/scoringService.js';
import { recordUserActivity } from '../services/streakService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createMatch = asyncHandler(async (req, res) => {
  // Support frontend matchAPI.createMatch({ roomCode, player1, player2, questions })
  if (req.body.roomCode && (req.body.player1 || req.body.player2)) {
    let { roomCode, player1, player2, questions, type = 'private', duration = 600, difficulty = 'Medium', timeLimit, questionCount } = req.body;
    
    if ([5, 10, 15].includes(Number(duration))) {
      duration = Number(duration) * 60;
    }
    if (![300, 600, 900].includes(Number(duration))) {
      duration = 600;
    }

    const qCount = [1, 2, 3].includes(parseInt(questionCount, 10))
      ? parseInt(questionCount, 10)
      : (Array.isArray(questions) && questions.length > 0 ? questions.length : 1);

    const normalizedTimeLimit = `${Math.floor(duration / 60) < 10 ? '0' : ''}${Math.floor(duration / 60)}:00`;

    const match = new Match({
      roomCode: roomCode.toUpperCase(),
      type,
      isPrivate: type === 'private' || type === 'scrimmage',
      difficulty,
      timeLimit: timeLimit || normalizedTimeLimit,
      duration,
      questionCount: qCount,
      status: 'ACTIVE',
      players: [
        { ...(player1 || {}), userId: player1?.id || player1?.userId, solved: [], totalTime: 0, status: 'ACTIVE' },
        { ...(player2 || {}), userId: player2?.id || player2?.userId, solved: [], totalTime: 0, status: 'ACTIVE' }
      ],
      problems: questions || [],
      startedAt: new Date()
    });

    await match.save();

    return res.status(201).json({
      success: true,
      match,
      data: { match }
    });
  }

  // Standard creation
  const { type = 'private', duration, difficulty, problemIds, questionCount } = req.body;
  const userId = req.user?.id || req.body.hostId || 'guest_host';

  const match = await createPrivateMatch(userId, type, {
    duration,
    difficulty,
    problemIds,
    questionCount
  });

  res.status(201).json({
    success: true,
    message: 'Match created',
    match,
    data: { match }
  });
});

export const joinExistingMatch = asyncHandler(async (req, res) => {
  const { roomCode } = req.body;
  const userId = req.user?.id || req.body.playerId;

  const match = await joinMatch(roomCode, userId);

  res.json({
    success: true,
    message: 'Joined match',
    match,
    data: { match }
  });
});

export const getMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await getMatchById(id);

  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }

  res.json({
    success: true,
    match,
    data: { match }
  });
});

export const updateProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { playerId, questionIndex, time } = req.body;

  const match = await getMatchById(id);
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }

  const player = match.players.find(
    (p) => String(p.userId) === String(playerId) || String(p.id) === String(playerId)
  );

  if (player) {
    if (questionIndex !== undefined) {
      player.problemsSolved = (player.problemsSolved || 0) + 1;
    }
    if (time !== undefined) {
      player.totalTime = time;
    }
    await match.save();
  }

  res.json({
    success: true,
    match,
    data: { match }
  });
});

export const startBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const match = await startMatch(id);

  res.json({
    success: true,
    message: 'Match started',
    match,
    data: { match }
  });
});

export const completeBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const completedMatch = await completeMatch(id);

  res.json({
    success: true,
    message: 'Match completed',
    match: completedMatch,
    data: { match: completedMatch }
  });
});

export const abandonBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body?.playerId;
  const problemTitle = req.body?.problemTitle;
  const difficulty = req.body?.difficulty;

  const match = await abandonMatch(id, userId, { problemTitle, difficulty });

  res.json({
    success: true,
    message: 'Match abandoned',
    match,
    data: { match }
  });
});

export const getMatchByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const match = await getMatchByRoomCode(code);

  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }

  res.json({
    success: true,
    match,
    data: { match }
  });
});

export const listMatches = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const matches = await Match.find({}).sort({ createdAt: -1 }).limit(limit);

  res.json({
    success: true,
    matches,
    data: { matches, count: matches.length }
  });
});

export default {
  createMatch,
  joinExistingMatch,
  getMatch,
  listMatches,
  updateProgress,
  startBattle,
  completeBattle,
  abandonBattle,
  getMatchByCode
};
