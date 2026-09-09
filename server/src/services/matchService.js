import { isMongoConnected } from '../config/database.js';
import Match from '../models/Match.js';
import { inMemoryStore } from './inMemoryStore.js';
import { calculateRatingChange } from './scoringService.js';
import { getUserById } from './authService.js';

async function buildPlayerEntry(userId, status = 'waiting') {
  const user = await getUserById(userId);
  return {
    userId,
    username: user?.username,
    avatar: user?.avatar,
    ratingBefore: user?.rating || 1500,
    totalTime: 0,
    problemsSolved: 0,
    submissions: 0,
    status,
    problemResults: []
  };
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createPrivateMatch(hostId, type = 'private') {
  if (isMongoConnected()) {
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
    } while (await Match.findOne({ roomCode }) && attempts < 10);
    
    const problems = await getRandomProblems(3);
    
    const match = new Match({
      roomCode,
      type,
      status: 'WAITING',
      isPrivate: type === 'private',
      players: [await buildPlayerEntry(hostId)],
      problems
    });
    
    await match.save();
    return match;
  } else {
    return inMemoryStore.createMatch({
      roomCode: generateRoomCode(),
      type,
      status: 'WAITING',
      isPrivate: type === 'private',
      players: [await buildPlayerEntry(hostId)],
      problems: inMemoryStore.getRandomProblems(3)
    });
  }
}

export async function joinMatch(roomCode, userId) {
  if (isMongoConnected()) {
    const match = await Match.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!match) {
      const err = new Error('Match not found');
      err.statusCode = 404;
      err.code = 'MATCH_NOT_FOUND';
      throw err;
    }
    
    if (match.status !== 'WAITING') {
      const err = new Error('Match is no longer accepting players');
      err.statusCode = 409;
      err.code = 'MATCH_UNAVAILABLE';
      throw err;
    }
    
    // Check if already in match
    if (match.players.some(p => p.userId.toString() === userId)) {
      const err = new Error('Already in this match');
      err.statusCode = 409;
      err.code = 'ALREADY_IN_MATCH';
      throw err;
    }
    
    if (match.players.length >= 2) {
      const err = new Error('Match is full');
      err.statusCode = 409;
      err.code = 'MATCH_FULL';
      throw err;
    }
    
    match.players.push(await buildPlayerEntry(userId));
    match.status = 'MATCHED';
    
    await match.save();
    return match;
  } else {
    const match = inMemoryStore.getMatchByRoomCode(roomCode);
    
    if (!match) {
      const err = new Error('Match not found');
      err.statusCode = 404;
      err.code = 'MATCH_NOT_FOUND';
      throw err;
    }
    
    if (match.status !== 'WAITING') {
      const err = new Error('Match is no longer accepting players');
      err.statusCode = 409;
      err.code = 'MATCH_UNAVAILABLE';
      throw err;
    }
    
    if (match.players.some(p => p.userId === userId)) {
      const err = new Error('Already in this match');
      err.statusCode = 409;
      err.code = 'ALREADY_IN_MATCH';
      throw err;
    }
    
    if (match.players.length >= 2) {
      const err = new Error('Match is full');
      err.statusCode = 409;
      err.code = 'MATCH_FULL';
      throw err;
    }
    
    match.players.push(await buildPlayerEntry(userId));
    match.status = 'MATCHED';
    
    return match;
  }
}

export async function startMatch(matchId, userId) {
  if (isMongoConnected()) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      const err = new Error('Match not found');
      err.statusCode = 404;
      throw err;
    }
    
    if (match.status !== 'MATCHED') {
      const err = new Error('Match is not ready to start');
      err.statusCode = 400;
      throw err;
    }
    
    if (match.players.length < 2) {
      const err = new Error('Cannot start match with less than 2 players');
      err.statusCode = 400;
      throw err;
    }
    
    match.status = 'ACTIVE';
    match.startedAt = new Date();
    
    await match.save();
    return match;
  } else {
    const match = inMemoryStore.getMatch(matchId);
    
    if (!match) {
      const err = new Error('Match not found');
      err.statusCode = 404;
      throw err;
    }
    
    if (match.status !== 'MATCHED') {
      const err = new Error('Match is not ready to start');
      err.statusCode = 400;
      throw err;
    }
    
    match.status = 'ACTIVE';
    match.startedAt = new Date();
    
    return match;
  }
}

export async function getMatchById(matchId) {
  if (isMongoConnected()) {
    return await Match.findById(matchId);
  } else {
    return inMemoryStore.getMatch(matchId);
  }
}

export async function getMatchByRoomCode(code) {
  if (isMongoConnected()) {
    return await Match.findOne({ roomCode: code.toUpperCase() });
  } else {
    return inMemoryStore.getMatchByRoomCode(code);
  }
}

export async function completeMatch(matchId) {
  const match = await getMatchById(matchId);
  if (!match) {
    const err = new Error('Match not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (match.status === 'COMPLETED') return match;
  
  // Calculate winner based on problems solved (then time)
  const [player1, player2] = match.players;
  
  if (!player1 || !player2) {
    const err = new Error('Match must have 2 players to complete');
    err.statusCode = 400;
    throw err;
  }

  player1.problemsSolved = player1.problemsSolved || 0;
  player2.problemsSolved = player2.problemsSolved || 0;
  player1.totalTime = player1.totalTime || 0;
  player2.totalTime = player2.totalTime || 0;
  
  let winner = null;
  let result = 'draw';
  
  if (player1.problemsSolved > player2.problemsSolved) {
    winner = player1.userId;
    result = 'player1';
  } else if (player2.problemsSolved > player1.problemsSolved) {
    winner = player2.userId;
    result = 'player2';
  } else if (player1.totalTime < player2.totalTime) {
    winner = player1.userId;
    result = 'player1';
  } else if (player2.totalTime < player1.totalTime) {
    winner = player2.userId;
    result = 'player2';
  }
  
  // Calculate rating changes
  const rating1Before = player1.ratingBefore || 1500;
  const rating2Before = player2.ratingBefore || 1500;
  
  const rating1Change = calculateRatingChange(rating1Before, rating2Before, result === 'player1' ? 1 : result === 'player2' ? 0 : 0.5);
  const rating2Change = -rating1Change;
  
  player1.ratingAfter = rating1Before + rating1Change;
  player2.ratingAfter = rating2Before + rating2Change;
  player1.ratingChange = rating1Change;
  player2.ratingChange = rating2Change;
  player1.status = 'finished';
  player2.status = 'finished';
  
  match.status = 'COMPLETED';
  match.winner = winner;
  match.result = result;
  match.completedAt = new Date();
  match.duration = match.startedAt ? 
    Math.floor((match.completedAt - match.startedAt) / 1000) : 0;
  
  if (isMongoConnected()) {
    await match.save();
  }
  
  return match;
}

async function getRandomProblems(count) {
  if (isMongoConnected()) {
    const CodingProblem = (await import('../models/CodingProblem.js')).default;
    const problems = await CodingProblem.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: count } }
    ]);
    return problems.map(p => p._id);
  } else {
    return inMemoryStore.getRandomProblems(count).map(p => p.id);
  }
}

// Export getRandomProblems for use in controllers
export { getRandomProblems };

export default { createPrivateMatch, joinMatch, startMatch, getMatchById, getMatchByRoomCode, completeMatch };
