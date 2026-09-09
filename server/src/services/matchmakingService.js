import { isMongoConnected } from '../config/database.js';
import Match from '../models/Match.js';
import { inMemoryStore } from './inMemoryStore.js';
import { createPrivateMatch, joinMatch } from './matchService.js';

// ============== MATCHMAKING QUEUE ==============

export async function joinQueue(userId) {
  if (isMongoConnected()) {
    // Check if user is already in a match
    const activeMatch = await Match.findOne({
      'players.userId': userId,
      status: { $in: ['WAITING', 'MATCHED', 'ACTIVE'] }
    });
    
    if (activeMatch) {
      const err = new Error('Player is already in a match');
      err.statusCode = 409;
      err.code = 'IN_MATCH';
      throw err;
    }
    
    // Add to queue via in-memory tracking (for speed)
    return inMemoryStore.addToQueue(userId);
  } else {
    return inMemoryStore.addToQueue(userId);
  }
}

export async function leaveQueue(userId) {
  if (isMongoConnected()) {
    // In a real system with persistent queue, remove from queue collection
    return inMemoryStore.removeFromQueue(userId);
  } else {
    return inMemoryStore.removeFromQueue(userId);
  }
}

export async function findMatch(userId) {
  // Opponent search only — joinQueue already placed this user in the queue
  const opponent = inMemoryStore.findOpponent(userId);
  
  if (!opponent) {
    return null;
  }
  
  // Remove both from queue
  inMemoryStore.removeFromQueue(userId);
  inMemoryStore.removeFromQueue(opponent.userId);
  
  // Create a match between them
  let match = await createPrivateMatch(userId, 'ranked');
  
  if (match.players.every(p => p.userId.toString() !== opponent.userId.toString())) {
    match = await joinMatch(match.roomCode, opponent.userId);
  } else {
    match.status = 'MATCHED';
    if (isMongoConnected()) {
      await match.save();
    }
  }
  
  return match;
}

export async function getQueueStatus(userId) {
  if (isMongoConnected()) {
    const position = inMemoryStore.getQueuePosition(userId);
    const isInQueue = position > -1;
    
    if (!isInQueue) {
      return { inQueue: false, position: 0, estimatedWait: 0 };
    }
    
    const queueLength = inMemoryStore.matchmakingQueue.length;
    
    return {
      inQueue: true,
      position,
      queueLength,
      estimatedWait: position * 5  // 5 sec per player estimate
    };
  } else {
    const position = inMemoryStore.getQueuePosition(userId);
    return {
      inQueue: position > -1,
      position: Math.max(0, position),
      queueLength: inMemoryStore.matchmakingQueue.length,
      estimatedWait: Math.max(0, position) * 5
    };
  }
}

export default { joinQueue, leaveQueue, findMatch, getQueueStatus };
