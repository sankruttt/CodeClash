import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Match from '../models/Match.js';
import CodingProblem from '../models/CodingProblem.js';
import { abandonMatch } from './matchService.js';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function parseDurationToSeconds(timeLimit) {
  if (typeof timeLimit === 'number') return timeLimit;
  if (!timeLimit || typeof timeLimit !== 'string') return 900; // 15 min default

  const parts = timeLimit.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  const parsedInt = parseInt(timeLimit, 10);
  return !isNaN(parsedInt) ? parsedInt * 60 : 900;
}

export async function createRoom({
  hostId,
  hostName,
  difficulty = 'Medium',
  timeLimit = '10:00',
  questions = null
}) {
  const validDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
  const normalizedTime = timeLimit?.length === 4 ? `0${timeLimit}` : timeLimit;
  const validTimeLimit = ['05:00', '10:00', '15:00'].includes(normalizedTime) ? normalizedTime : '10:00';
  const duration = parseDurationToSeconds(validTimeLimit);

  let roomCode;
  let attempts = 0;
  const maxAttempts = 50;
  do {
    roomCode = generateRoomCode();
    attempts++;
  } while ((await Room.findOne({ code: roomCode })) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    const err = new Error('Failed to generate unique room code');
    err.statusCode = 500;
    err.code = 'ROOM_CODE_GENERATION_FAILED';
    throw err;
  }

  const room = new Room({
    code: roomCode,
    hostId,
    hostName,
    difficulty: validDifficulty,
    timeLimit: validTimeLimit,
    duration,
    questions: questions || [],
    status: 'waiting'
  });

  await room.save();
  return room.toJSON ? room.toJSON() : room;
}

export async function updateRoomSettings(code, arg2, arg3 = {}) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    throw err;
  }

  let hostId = null;
  let settings = {};

  if (arg2 && typeof arg2 === 'object' && !mongoose.Types.ObjectId.isValid(arg2)) {
    settings = arg2;
    hostId = settings.hostId;
  } else {
    hostId = arg2;
    settings = arg3 || {};
  }

  if (!hostId && settings.hostId) {
    hostId = settings.hostId;
  }

  const { difficulty, timeLimit } = settings;

  const upperCode = code.toUpperCase();
  const room = await Room.findOne({ code: upperCode });

  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    throw err;
  }

  if (hostId && String(room.hostId) !== String(hostId)) {
    const err = new Error('Only the room host can modify room settings');
    err.statusCode = 403;
    err.code = 'NOT_ROOM_OWNER';
    throw err;
  }

  if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    room.difficulty = difficulty;
  }

  if (timeLimit) {
    const normalizedTime = timeLimit.length === 4 ? `0${timeLimit}` : timeLimit;
    if (!['05:00', '10:00', '15:00'].includes(normalizedTime)) {
      const err = new Error('Invalid duration: only 5, 10, or 15 minutes allowed');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    room.timeLimit = normalizedTime;
    room.duration = parseDurationToSeconds(normalizedTime);
  }

  await room.save();
  return room.toJSON ? room.toJSON() : room;
}

export async function getRoomByCode(code) {
  if (!code) return null;
  const upperCode = code.toUpperCase();

  const room = await Room.findOne({ code: upperCode });
  return room ? (room.toJSON ? room.toJSON() : room) : null;
}

export async function joinRoomByCode(code, playerId, playerName) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  const room = await Room.findOne({ code: upperCode });
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    err.code = 'ROOM_NOT_FOUND';
    throw err;
  }

  if (room.status !== 'waiting') {
    const err = new Error('Room is no longer accepting players');
    err.statusCode = 400;
    err.code = 'ROOM_NOT_WAITING';
    throw err;
  }

  if (String(room.hostId) === String(playerId)) {
    const err = new Error('Cannot join your own room');
    err.statusCode = 400;
    err.code = 'CANNOT_JOIN_OWN_ROOM';
    throw err;
  }

  room.guestId = playerId;
  room.guestName = playerName;
  room.status = 'ready';
  await room.save();
  return room.toJSON ? room.toJSON() : room;
}

export async function leaveRoomByCode(code, playerId) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  const room = await Room.findOne({ code: upperCode });
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    err.code = 'ROOM_NOT_FOUND';
    throw err;
  }

  // If match was already in progress, handle as abandonment
  if (room.status === 'in_progress') {
    return await abandonRoomByCode(upperCode, playerId);
  }

  if (String(room.hostId) === String(playerId)) {
    await Room.deleteOne({ _id: room._id });
  } else if (String(room.guestId) === String(playerId)) {
    room.guestId = null;
    room.guestName = null;
    room.status = 'waiting';
    await room.save();
  }
  return true;
}

export async function startRoomByCode(code, requesterId = null) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  const room = await Room.findOne({ code: upperCode });
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    err.code = 'ROOM_NOT_FOUND';
    throw err;
  }

  if (requesterId && room.hostId && String(room.hostId) !== String(requesterId)) {
    const err = new Error('Only the room owner can start the match');
    err.statusCode = 403;
    err.code = 'NOT_ROOM_OWNER';
    throw err;
  }

  // Idempotency: duplicate start requests return the active room
  if (room.status === 'in_progress') {
    return room.toJSON ? room.toJSON() : room;
  }

  if (room.status !== 'ready' || !room.guestId) {
    const err = new Error('Cannot start match before all required players have joined');
    err.statusCode = 400;
    err.code = 'ROOM_NOT_READY';
    throw err;
  }

  // Server-authoritative problem selection strictly matching room difficulty
  const selectedDifficulty = room.difficulty || 'Medium';
  let problemDocs = await CodingProblem.aggregate([
    { $match: { difficulty: selectedDifficulty, isActive: true } },
    { $sample: { size: 1 } }
  ]);

  if (!problemDocs || problemDocs.length === 0) {
    problemDocs = await CodingProblem.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 1 } }
    ]);
  }

  const selectedProblem = problemDocs[0];
  const durationSeconds = room.duration || parseDurationToSeconds(room.timeLimit);
  const startedAt = new Date();

  // Create authoritative Match in MongoDB
  const match = new Match({
    roomCode: upperCode,
    type: 'private',
    status: 'ACTIVE',
    isPrivate: true,
    difficulty: selectedDifficulty,
    timeLimit: room.timeLimit,
    duration: durationSeconds,
    startedAt,
    problems: selectedProblem ? [selectedProblem._id] : [],
    players: [
      {
        userId: room.hostId,
        username: room.hostName,
        ratingBefore: 1500,
        status: 'ACTIVE'
      },
      {
        userId: room.guestId,
        username: room.guestName,
        ratingBefore: 1500,
        status: 'ACTIVE'
      }
    ]
  });

  await match.save();

  // Update Room with authoritative match state
  room.matchId = match._id;
  room.status = 'in_progress';
  room.startedAt = startedAt;
  room.questions = selectedProblem ? [selectedProblem] : [];
  await room.save();

  return room.toJSON ? room.toJSON() : room;
}

export async function abandonRoomByCode(code, leavingUserId) {
  if (!code) return null;
  const upperCode = code.toUpperCase();

  const room = await Room.findOne({ code: upperCode });
  if (!room) return null;

  room.status = 'abandoned';
  room.abandonedBy = leavingUserId;
  room.completedAt = new Date();
  await room.save();

  // Trigger match abandonment and penalty calculation
  await abandonMatch(room.matchId || room.code, leavingUserId).catch((err) => {
    console.warn('Abandon match warning:', err.message);
  });

  return room.toJSON ? room.toJSON() : room;
}

export default {
  parseDurationToSeconds,
  createRoom,
  updateRoomSettings,
  getRoomByCode,
  joinRoomByCode,
  leaveRoomByCode,
  startRoomByCode,
  abandonRoomByCode
};
