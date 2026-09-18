import { asyncHandler } from '../middleware/errorHandler.js';
import * as roomService from '../services/roomService.js';

export const create = asyncHandler(async (req, res) => {
  let { hostId, hostName, difficulty = 'Medium', timeLimit = '10:00', duration, questions } = req.body;

  if (!hostId || !hostName) {
    return res.status(400).json({
      success: false,
      error: 'Host ID and name are required',
      message: 'Host ID and name are required'
    });
  }

  // Validate difficulty
  if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Difficulty must be Easy, Medium, or Hard'
    });
  }

  // Normalize and validate duration / timeLimit
  let normalizedTime = timeLimit;
  if (typeof normalizedTime === 'number') {
    normalizedTime = `${normalizedTime < 10 ? '0' : ''}${normalizedTime}:00`;
  }
  if (normalizedTime && normalizedTime.length === 4) {
    normalizedTime = `0${normalizedTime}`;
  }
  if (normalizedTime && !['05:00', '10:00', '15:00'].includes(normalizedTime)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Duration must be 5, 10, or 15 minutes'
    });
  }

  let durationSec = duration;
  if (typeof durationSec === 'number' && [5, 10, 15].includes(durationSec)) {
    durationSec *= 60;
  }
  if (!durationSec && normalizedTime) {
    durationSec = normalizedTime === '05:00' ? 300 : normalizedTime === '10:00' ? 600 : 900;
  }

  const room = await roomService.createRoom({
    hostId,
    hostName,
    difficulty: difficulty || 'Medium',
    timeLimit: normalizedTime || '10:00',
    duration: durationSec || 600,
    questions
  });

  res.status(201).json({
    success: true,
    code: room.code,
    room,
    data: {
      room,
      code: room.code
    }
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { difficulty, timeLimit, duration, hostId } = req.body;

  if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Difficulty must be Easy, Medium, or Hard'
    });
  }

  if (timeLimit) {
    let normalizedTime = timeLimit;
    if (typeof normalizedTime === 'number') {
      normalizedTime = `${normalizedTime < 10 ? '0' : ''}${normalizedTime}:00`;
    }
    if (normalizedTime && normalizedTime.length === 4) {
      normalizedTime = `0${normalizedTime}`;
    }
    if (!['05:00', '10:00', '15:00'].includes(normalizedTime)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Duration must be 5, 10, or 15 minutes'
      });
    }
  }

  if (duration !== undefined) {
    let durSec = duration;
    if (typeof durSec === 'number' && [5, 10, 15].includes(durSec)) durSec *= 60;
    if (![300, 600, 900].includes(durSec)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Duration must be 5, 10, or 15 minutes'
      });
    }
  }

  const room = await roomService.updateRoomSettings(code, {
    difficulty,
    timeLimit,
    duration,
    hostId: hostId || req.user?.id
  });

  res.json({
    success: true,
    room,
    data: { room }
  });
});

export const join = asyncHandler(async (req, res) => {
  const { roomCode, playerId, playerName } = req.body;

  if (!roomCode || !playerId || !playerName) {
    return res.status(400).json({
      success: false,
      error: 'Room code, player ID, and name are required',
      message: 'Room code, player ID, and name are required'
    });
  }

  const room = await roomService.joinRoomByCode(roomCode, playerId, playerName);

  res.json({
    success: true,
    room,
    data: { room }
  });
});

export const getRoom = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const room = await roomService.getRoomByCode(code);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found',
      message: 'Room not found'
    });
  }

  res.json({
    success: true,
    room,
    data: { room }
  });
});

export const leave = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const playerId = req.body?.playerId || req.user?.id;

  await roomService.leaveRoomByCode(code, playerId);

  res.json({
    success: true,
    message: 'Left room successfully'
  });
});

export const abandon = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const playerId = req.body?.playerId || req.user?.id;

  const room = await roomService.abandonRoomByCode(code, playerId);

  res.json({
    success: true,
    message: 'Match abandoned',
    room,
    data: { room }
  });
});

export const start = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const requesterId = req.body?.userId || req.body?.playerId || req.body?.hostId || req.user?.id;

  const room = await roomService.startRoomByCode(code, requesterId);

  res.json({
    success: true,
    room,
    data: { room }
  });
});

export default {
  create,
  updateSettings,
  join,
  getRoom,
  leave,
  abandon,
  start
};
