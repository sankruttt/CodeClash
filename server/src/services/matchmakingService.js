import Match from '../models/Match.js';
import { createPrivateMatch, joinMatch, abandonMatch } from './matchService.js';

// Transient queue for active in-flight matchmaking requests
const matchmakingQueue = [];

export async function joinQueue(userId, options = {}) {
  const now = Date.now();

  const qCount = parseInt(options.questionCount, 10) || 1;
  if (![1, 2, 3].includes(qCount)) {
    const err = new Error('Invalid questionCount: only 1, 2, or 3 questions allowed');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  let durMins = parseInt(options.duration, 10) || 10;
  if ([300, 600, 900].includes(durMins)) {
    durMins = Math.floor(durMins / 60);
  }
  if (![5, 10, 15].includes(durMins)) {
    const err = new Error('Invalid duration: only 5, 10, or 15 minutes allowed');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const durSecs = durMins * 60;

  // 1. Purge any stale entries older than 30 seconds from matchmakingQueue
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    const entryAge = now - new Date(matchmakingQueue[i].timestamp || 0).getTime();
    if (entryAge > 30000) {
      matchmakingQueue.splice(i, 1);
    }
  }

  // 2. Prevent rapid duplicate entries within 10 seconds
  const existingIdx = matchmakingQueue.findIndex((item) => String(item.userId) === String(userId));
  if (existingIdx !== -1) {
    const existingEntry = matchmakingQueue[existingIdx];
    const age = now - new Date(existingEntry.timestamp || 0).getTime();
    if (age < 10000) {
      const err = new Error('Player is already in matchmaking queue');
      err.statusCode = 409;
      err.code = 'ALREADY_IN_QUEUE';
      throw err;
    } else {
      existingEntry.timestamp = new Date();
      existingEntry.questionCount = qCount;
      existingEntry.duration = durMins;
      existingEntry.durationSeconds = durSecs;
      return {
        inQueue: true,
        position: existingIdx + 1,
        questionCount: qCount,
        duration: durMins
      };
    }
  }

  // 2. Resolve any existing matches for this user that are still marked WAITING, MATCHED, or ACTIVE
  const activeMatches = await Match.find({
    'players.userId': userId,
    status: { $in: ['WAITING', 'MATCHED', 'ACTIVE'] }
  });

  for (const m of activeMatches) {
    const started = new Date(m.startedAt || m.createdAt || 0).getTime();
    const ageSeconds = Math.floor((now - started) / 1000);
    const maxDurationSeconds = (m.duration || 900) + 60;

    // Stale matches older than duration or waiting/matched for > 2 mins are auto-closed
    const isStale = ageSeconds > maxDurationSeconds ||
      ((m.status === 'WAITING' || m.status === 'MATCHED') && ageSeconds > 120);

    if (isStale) {
      const newStatus = m.status === 'WAITING' ? 'CANCELLED' : 'ABANDONED';
      await Match.updateOne({ _id: m._id }, { $set: { status: newStatus, completedAt: new Date() } });
    } else {
      // If user is intentionally queuing for a new match, auto-abandon the prior match
      await abandonMatch(m._id, userId).catch((err) => {
        console.warn('Auto-abandon prior match on new queue join:', err.message);
      });
    }
  }

  matchmakingQueue.push({
    userId,
    questionCount: qCount,
    duration: durMins,
    durationSeconds: durSecs,
    timestamp: new Date()
  });

  return {
    inQueue: true,
    position: matchmakingQueue.length,
    questionCount: qCount,
    duration: durMins
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
  const userEntry = matchmakingQueue.find((item) => String(item.userId) === String(userId));
  const opponentIdx = matchmakingQueue.findIndex((item) => String(item.userId) !== String(userId));
  if (opponentIdx === -1) {
    return null;
  }

  const opponent = matchmakingQueue[opponentIdx];

  const matchedQuestionCount = userEntry?.questionCount || opponent.questionCount || 1;
  const matchedDurationSeconds = userEntry?.durationSeconds || opponent.durationSeconds || 600;

  // Remove both from transient queue
  leaveQueue(userId);
  leaveQueue(opponent.userId);

  // Create real match in MongoDB with matched configuration
  let match = await createPrivateMatch(userId, 'ranked', {
    questionCount: matchedQuestionCount,
    duration: matchedDurationSeconds
  });
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
