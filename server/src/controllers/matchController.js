import { v4 as uuidv4 } from 'uuid';
import { isMongoConnected } from '../config/database.js';
import Match from '../models/Match.js';
import { inMemoryStore } from '../services/inMemoryStore.js';
import { 
  createPrivateMatch, 
  joinMatch, 
  startMatch, 
  getMatchById, 
  getMatchByRoomCode, 
  completeMatch 
} from '../services/matchService.js';
import { updatePlayerStatsAfterMatch, addMatchHistory } from '../services/scoringService.js';
import { recordUserActivity } from '../services/streakService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createMatch = asyncHandler(async (req, res) => {
  // Support frontend matchAPI.createMatch({ roomCode, player1, player2, questions })
  if (req.body.roomCode && (req.body.player1 || req.body.player2)) {
    const { roomCode, player1, player2, questions } = req.body;
    const matchId = uuidv4();
    const match = {
      id: matchId,
      roomCode: roomCode.toUpperCase(),
      players: [
        { ...(player1 || {}), id: player1?.id || 'player1', solved: [], totalTime: 0 },
        { ...(player2 || {}), id: player2?.id || 'player2', solved: [], totalTime: 0 }
      ],
      questions: questions || [],
      status: 'in_progress',
      winner: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    inMemoryStore.matches.set(matchId, match);

    return res.status(201).json({
      success: true,
      match,
      data: { match }
    });
  }

  // Standard v2 creation
  const { type = 'private' } = req.body;
  const userId = req.user?.id || 'guest_host';
  
  const match = await createPrivateMatch(userId, type);
  
  res.status(201).json({
    success: true,
    message: 'Match created',
    match,
    data: { match }
  });
});

export const joinExistingMatch = asyncHandler(async (req, res) => {
  const { roomCode } = req.body;
  const userId = req.user.id;
  
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
  const userId = req.user?.id;
  
  let match = inMemoryStore.getMatch(id);
  if (!match) {
    match = await getMatchById(id);
  }
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  // Verify user is in this match if authenticated and match has registered user participants
  if (userId && match.players && match.players.some(p => p.userId)) {
    const isParticipant = match.players.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this match'
      });
    }
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

  let match = inMemoryStore.getMatch(id);
  if (match) {
    match = inMemoryStore.updateMatchProgress(id, playerId, questionIndex, time);
    return res.json({
      success: true,
      match,
      data: { match }
    });
  }

  if (isMongoConnected()) {
    const mongoMatch = await Match.findById(id);
    if (mongoMatch) {
      let player = mongoMatch.players.find(p => p.userId?.toString() === playerId || p.id === playerId);
      if (player) {
        if (questionIndex !== undefined) {
          player.problemsSolved = (player.problemsSolved || 0) + 1;
        }
        if (time !== undefined) {
          player.totalTime = time;
        }
        await mongoMatch.save();
      }
      return res.json({
        success: true,
        match: mongoMatch,
        data: { match: mongoMatch }
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'MATCH_NOT_FOUND',
    message: 'Match not found'
  });
});

export const startBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  let existingMatch = inMemoryStore.getMatch(id);
  if (existingMatch) {
    existingMatch.status = 'in_progress';
    existingMatch.startedAt = new Date().toISOString();
    return res.json({
      success: true,
      message: 'Match started',
      match: existingMatch,
      data: { match: existingMatch }
    });
  }

  existingMatch = await getMatchById(id);
  if (!existingMatch) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  if (userId) {
    const isParticipant = existingMatch.players.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this match'
      });
    }
  }
  
  const match = await startMatch(id, userId);
  
  res.json({
    success: true,
    message: 'Match started',
    match,
    data: { match }
  });
});

export const completeBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { winner, scores } = req.body || {};
  const userId = req.user?.id;
  
  // 1. Direct completion from frontend with explicit winner/scores
  if (winner !== undefined || scores !== undefined) {
    if (winner && !String(winner).startsWith('guest_')) {
      await recordUserActivity(winner).catch(() => null);
    }
    if (userId && !String(userId).startsWith('guest_')) {
      await recordUserActivity(userId).catch(() => null);
    }

    let inMemMatch = inMemoryStore.getMatch(id);
    if (inMemMatch) {
      inMemMatch.status = 'completed';
      inMemMatch.winner = winner || null;
      inMemMatch.completedAt = new Date().toISOString();
      inMemMatch.finalScores = scores || null;
      return res.json({
        success: true,
        match: inMemMatch,
        data: { match: inMemMatch }
      });
    }

    if (isMongoConnected()) {
      const mongoMatch = await Match.findById(id);
      if (mongoMatch) {
        mongoMatch.status = 'COMPLETED';
        mongoMatch.winner = winner || null;
        mongoMatch.completedAt = new Date();
        if (scores) mongoMatch.finalScores = scores;
        await mongoMatch.save();
        return res.json({
          success: true,
          match: mongoMatch,
          data: { match: mongoMatch }
        });
      }
    }
  }

  // 2. Server evaluation completion
  const match = await getMatchById(id);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  if (userId) {
    const isParticipant = match.players.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this match'
      });
    }
  }
  
  if (match.status !== 'ACTIVE' && match.status !== 'in_progress') {
    return res.status(400).json({
      success: false,
      error: 'MATCH_NOT_ACTIVE',
      message: 'Match is not currently active and cannot be completed'
    });
  }
  
  const completedMatch = await completeMatch(id);
  
  for (const player of completedMatch.players) {
    const opponent = completedMatch.players.find(p => p.userId?.toString() !== player.userId?.toString());
    if (player.userId) {
      await updatePlayerStatsAfterMatch(player.userId, completedMatch, player);
      await addMatchHistory(player.userId, completedMatch, player, opponent);
      await recordUserActivity(player.userId).catch(() => null);
    }
  }
  
  res.json({
    success: true,
    message: 'Match completed',
    match: completedMatch,
    data: { match: completedMatch }
  });
});

export const getMatchByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const userId = req.user?.id;
  
  const match = await getMatchByRoomCode(code);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  if (userId) {
    const isParticipant = match.players.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'NOT_PARTICIPANT',
        message: 'You are not a participant in this match'
      });
    }
  }
  
  res.json({
    success: true,
    match,
    data: { match }
  });
});

export const listMatches = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  if (isMongoConnected()) {
    const matches = await Match.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json({
      success: true,
      matches,
      data: { matches, count: matches.length }
    });
  } else {
    const matches = Array.from(inMemoryStore.matches.values()).slice(0, limit);
    return res.json({
      success: true,
      matches,
      data: { matches, count: matches.length }
    });
  }
});

export default { 
  createMatch, 
  joinExistingMatch, 
  getMatch, 
  listMatches,
  updateProgress,
  startBattle, 
  completeBattle, 
  getMatchByCode 
};
