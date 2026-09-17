import { asyncHandler } from '../middleware/errorHandler.js';
import * as roomService from '../services/roomService.js';

export const create = asyncHandler(async (req, res) => {
  const { hostId, hostName, difficulty, timeLimit, questions } = req.body;

  if (!hostId || !hostName) {
    return res.status(400).json({
      success: false,
      error: 'Host ID and name are required',
      message: 'Host ID and name are required'
    });
  }

  const room = await roomService.createRoom({
    hostId,
    hostName,
    difficulty,
    timeLimit,
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
  const { difficulty, timeLimit, hostId } = req.body;

  const room = await roomService.updateRoomSettings(code, {
    difficulty,
    timeLimit,
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
