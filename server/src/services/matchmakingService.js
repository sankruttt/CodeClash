import Match from '../models/Match.js';
import { createPrivateMatch, joinMatch } from './matchService.js';

// Transient queue for active in-flight matchmaking requests
const matchmakingQueue = [];

export async function joinQueue(userId) {
  // Check if user is already in an active match in MongoDB
  const activeMatch = await Match.findOne({
    'players.userId': userId,
    status: { $in: ['WAITING', 'MATCHED', 'ACTIVE'] }
  });

  if (activeMatch) {
    const err = new Error('Player is already in an active match');
    err.statusCode = 409;
    err.code = 'IN_MATCH';
    throw err;
  }

  const existingIdx = matchmakingQueue.findIndex((item) => String(item.userId) === String(userId));
  if (existingIdx === -1) {
    matchmakingQueue.push({ userId, timestamp: new Date() });
  }

  return {
    inQueue: true,
    position: matchmakingQueue.length
  };
}

export async function leaveQueue(userId) {
  const index = matchmakingQueue.findIndex((item) => String(item.userId) === String(userId));
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
    return true;
  }
  return false;
}

export async function findMatch(userId) {
  const opponentIdx = matchmakingQueue.findIndex((item) => String(item.userId) !== String(userId));
  if (opponentIdx === -1) {
    return null;
  }

  const opponent = matchmakingQueue[opponentIdx];

  // Remove both from transient queue
  leaveQueue(userId);
  leaveQueue(opponent.userId);

  // Create real match in MongoDB
  let match = await createPrivateMatch(userId, 'ranked');
  if (match.players.every((p) => String(p.userId) !== String(opponent.userId))) {
    match = await joinMatch(match.roomCode, opponent.userId);
  } else {
    match.status = 'MATCHED';
    await match.save();
  }

  return match;
}

export async function getQueueStatus(userId) {
  const position = matchmakingQueue.findIndex((item) => String(item.userId) === String(userId));
  const isInQueue = position > -1;

  if (!isInQueue) {
    return { inQueue: false, position: 0, estimatedWait: 0 };
  }

  return {
    inQueue: true,
    position: position + 1,
    queueLength: matchmakingQueue.length,
    estimatedWait: (position + 1) * 5
  };
}

export default { joinQueue, leaveQueue, findMatch, getQueueStatus };
