import { 
  createPrivateMatch, 
  joinMatch, 
  startMatch, 
  getMatchById, 
  getMatchByRoomCode, 
  completeMatch 
} from '../services/matchService.js';
import { updatePlayerStatsAfterMatch, addMatchHistory } from '../services/scoringService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createMatch = asyncHandler(async (req, res) => {
  const { type = 'private', problemIds } = req.body;
  const userId = req.user.id;
  
  const match = await createPrivateMatch(userId, type);
  
  res.status(201).json({
    success: true,
    message: 'Match created',
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
    data: { match }
  });
});

export const getMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const match = await getMatchById(id);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  // Verify user is in this match
  const isParticipant = match.players.some(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      error: 'NOT_PARTICIPANT',
      message: 'You are not a participant in this match'
    });
  }
  
  res.json({
    success: true,
    data: { match }
  });
});

export const startBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Verify user is a participant in this match
  const existingMatch = await getMatchById(id);
  if (!existingMatch) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  const isParticipant = existingMatch.players.some(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      error: 'NOT_PARTICIPANT',
      message: 'You are not a participant in this match'
    });
  }
  
  const match = await startMatch(id, userId);
  
  res.json({
    success: true,
    message: 'Match started',
    data: { match }
  });
});

export const completeBattle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Get match first to verify
  const match = await getMatchById(id);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  // Verify user is in this match
  const isParticipant = match.players.some(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      error: 'NOT_PARTICIPANT',
      message: 'You are not a participant in this match'
    });
  }
  
  // Verify match is in a completable state
  if (match.status !== 'ACTIVE') {
    return res.status(400).json({
      success: false,
      error: 'MATCH_NOT_ACTIVE',
      message: 'Match is not currently active and cannot be completed'
    });
  }
  
  // Complete the match (server calculates winner)
  const completedMatch = await completeMatch(id);
  
  // Update statistics for both players
  for (const player of completedMatch.players) {
    const opponent = completedMatch.players.find(p => p.userId.toString() !== player.userId.toString());
    await updatePlayerStatsAfterMatch(player.userId, completedMatch, player);
    await addMatchHistory(player.userId, completedMatch, player, opponent);
  }
  
  res.json({
    success: true,
    message: 'Match completed',
    data: { match: completedMatch }
  });
});

export const getMatchByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const userId = req.user.id;
  
  const match = await getMatchByRoomCode(code);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }
  
  // Verify user is a participant in this match
  const isParticipant = match.players.some(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      error: 'NOT_PARTICIPANT',
      message: 'You are not a participant in this match'
    });
  }
  
  res.json({
    success: true,
    data: { match }
  });
});

export default { createMatch, joinExistingMatch, getMatch, startBattle, completeBattle, getMatchByCode };
