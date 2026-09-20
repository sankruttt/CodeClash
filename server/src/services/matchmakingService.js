import mongoose from 'mongoose';
import Match from '../models/Match.js';
import MatchmakingQueue from '../models/MatchmakingQueue.js';
import { createPrivateMatch, joinMatch, abandonMatch } from './matchService.js';

// Durable queue backed by MongoDB — shared across serverless instances so real
// 1v1 pairing works when deployed (the old in-memory array only worked inside a
// single long-lived Node process).

const STALE_ENTRY_MS = 30000; // queue entries older than this are purged
const DUPLICATE_ENTRY_MS = 10000; // re-join within this window is a 409
const MATCH_DISCOVERY_WINDOW_MS = 60000; // fresh server-created ranked match detection

function toObjectId(userId) {
  return mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
}

async function pruneStaleEntries() {
  const cutoff = new Date(Date.now() - STALE_ENTRY_MS);
  await MatchmakingQueue.deleteMany({ joinedAt: { $lt: cutoff } });
}

export async function joinQueue(userId, options = {}) {
  const id = toObjectId(userId);
  const now = new Date();

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

  // 1. Purge any stale entries older than 30 seconds
  await pruneStaleEntries();

  // 2. Resolve any existing matches for this user that are still marked WAITING, MATCHED, or ACTIVE
  const activeMatches = await Match.find({
    'players.userId': id,
    status: { $in: ['WAITING', 'MATCHED', 'ACTIVE'] }
  });

  const nowTs = Date.now();
  for (const m of activeMatches) {
    const started = new Date(m.startedAt || m.createdAt || 0).getTime();
    const ageSeconds = Math.floor((nowTs - started) / 1000);
    const maxDurationSeconds = (m.duration || 900) + 60;

    // Stale matches older than duration or waiting/matched for > 2 mins are auto-closed
    const isStale = ageSeconds > maxDurationSeconds ||
      ((m.status === 'WAITING' || m.status === 'MATCHED') && ageSeconds > 120);

    if (isStale) {
      const newStatus = m.status === 'WAITING' ? 'CANCELLED' : 'ABANDONED';
      await Match.updateOne({ _id: m._id }, { $set: { status: newStatus, completedAt: new Date() } });
    } else {
      // If user is intentionally queuing for a new match, auto-abandon the prior match
      await abandonMatch(m._id, id).catch((err) => {
        console.warn('Auto-abandon prior match on new queue join:', err.message);
      });
    }
  }

  // 3. Prevent rapid duplicate entries within 10 seconds (single slot per user)
  const existing = await MatchmakingQueue.findOne({ userId: id });
  if (existing) {
    const age = now - new Date(existing.joinedAt).getTime();
    if (age < DUPLICATE_ENTRY_MS) {
      const err = new Error('Player is already in matchmaking queue');
      err.statusCode = 409;
      err.code = 'ALREADY_IN_QUEUE';
      throw err;
    }
    existing.joinedAt = now;
    existing.status = 'queued';
    existing.matchedWith = null;
    existing.questionCount = qCount;
    existing.duration = durMins;
    existing.durationSeconds = durSecs;
    await existing.save();

    const ahead = await MatchmakingQueue.countDocuments({
      status: 'queued',
      joinedAt: { $lt: existing.joinedAt }
    });

    return {
      inQueue: true,
      position: ahead + 1,
      questionCount: qCount,
      duration: durMins
    };
  }

  await MatchmakingQueue.create({
    userId: id,
    questionCount: qCount,
    duration: durMins,
    durationSeconds: durSecs,
    joinedAt: now,
    status: 'queued'
  });

  const ahead = await MatchmakingQueue.countDocuments({
    status: 'queued',
    joinedAt: { $lt: now }
  });

  return {
    inQueue: true,
    position: ahead + 1,
    questionCount: qCount,
    duration: durMins
  };
}

export async function leaveQueue(userId) {
  const deleted = await MatchmakingQueue.deleteOne({ userId: toObjectId(userId) });
  return deleted.deletedCount > 0;
}

async function createMatchPair(hostId, opponent, preferred = {}) {
  const matchedQuestionCount = preferred.questionCount || opponent.questionCount || 1;
  const matchedDurationSeconds = preferred.durationSeconds || opponent.durationSeconds || 600;

  // Create real match in MongoDB with matched configuration
  let match = await createPrivateMatch(String(hostId), 'ranked', {
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

export async function findMatch(userId) {
  const id = toObjectId(userId);

  // Atomically flip THIS user's own slot to `matching` first, so concurrent
  // findMatch calls (two players joining at nearly the same instant, possibly on
  // different serverless instances) cannot both create a match for the same two
  // users. If another request already claimed us, we simply return null — the
  // claiming party is responsible for creating the match.
  const mine = await MatchmakingQueue.findOneAndUpdate(
    { userId: id, status: 'queued' },
    { $set: { status: 'matching' } }
  );
  if (!mine) return null;

  // Atomically claim an available opponent (oldest first) with the SAME match
  // configuration (question count + duration). Players who picked different
  // settings are never paired together.
  const opponent = await MatchmakingQueue.findOneAndUpdate(
    {
      userId: { $ne: id },
      status: 'queued',
      questionCount: mine.questionCount,
      duration: mine.duration
    },
    { $set: { status: 'matching', matchedWith: id } },
    { sort: { joinedAt: 1 } }
  );

  if (!opponent) {
    // No ready opponent right now — step back to `queued` so we stay an
    // available candidate for the other player's pairing attempt.
    await MatchmakingQueue.updateOne({ userId: id }, { $set: { status: 'queued' } });
    return null;
  }

  // Remove both from the queue, then build the persistent match.
  await MatchmakingQueue.deleteMany({ userId: { $in: [id, opponent.userId] } });
  return await createMatchPair(id, opponent, {
    questionCount: mine.questionCount,
    durationSeconds: mine.durationSeconds
  });
}

async function findRecentRealMatch(userId) {
  // The user was removed from the queue by findMatch when a real opponent was
  // found, so their own /join or /status request needs to discover the freshly
  // created ranked match (both real players) via this lookup.
  //
  // players[].userId is a Mixed field, so it may be stored as an ObjectId or as
  // a hex string depending on whether the player joined as host or guest —
  // match either form.
  const recentMatch = await Match.findOne({
    type: 'ranked',
    status: { $in: ['MATCHED', 'ACTIVE'] },
    createdAt: { $gte: new Date(Date.now() - MATCH_DISCOVERY_WINDOW_MS) },
    'players.userId': { $in: [userId, String(userId)] },
    'players.1': { $exists: true }
  }).sort({ createdAt: -1 });

  if (recentMatch && recentMatch.players.length >= 2 && recentMatch.players.every((p) => p.userId)) {
    return recentMatch;
  }
  return null;
}

export async function getQueueStatus(userId) {
  const id = toObjectId(userId);
  const entry = await MatchmakingQueue.findOne({ userId: id });

  if (entry) {
    // Opportunistic pairing: while the frontend polls, the server attempts to
    // complete a pairing. This makes concurrent joins on separate serverless
    // instances self-heal — after both players join, whichever status poll runs
    // while both are available completes the match. Only attempt it when a
    // same-configuration opponent is queued (self + at least one compat = ≥2).
    const compatible = await MatchmakingQueue.countDocuments({
      status: 'queued',
      questionCount: entry.questionCount,
      duration: entry.duration
    });
    if (compatible >= 2) {
      const paired = await findMatch(id);
      if (paired) {
        return {
          inQueue: false,
          position: 0,
          queueLength: compatible,
          estimatedWait: 0,
          status: 'matched',
          match: paired
        };
      }
    }

    // Re-fetch: this user may have just been removed from the queue by the
    // other player's successful pairing.
    const still = await MatchmakingQueue.findOne({ userId: id });
    if (!still) {
      const matched = await findRecentRealMatch(id);
      if (matched) {
        return {
          inQueue: false,
          position: 0,
          estimatedWait: 0,
          status: 'matched',
          match: matched
        };
      }
      return {
        inQueue: false,
        position: 0,
        estimatedWait: 0,
        status: 'idle'
      };
    }

    const ahead = await MatchmakingQueue.countDocuments({
      status: 'queued',
      joinedAt: { $lt: still.joinedAt }
    });
    const totalQueued = await MatchmakingQueue.countDocuments({ status: 'queued' });
    return {
      inQueue: true,
      position: ahead + 1,
      queueLength: totalQueued,
      estimatedWait: (ahead + 1) * 5,
      status: 'searching'
    };
  }

  const matched = await findRecentRealMatch(id);
  if (matched) {
    return {
      inQueue: false,
      position: 0,
      estimatedWait: 0,
      status: 'matched',
      match: matched
    };
  }

  return {
    inQueue: false,
    position: 0,
    estimatedWait: 0,
    status: 'idle'
  };
}

export default { joinQueue, leaveQueue, findMatch, getQueueStatus };