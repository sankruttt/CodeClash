import { isMongoConnected } from '../config/database.js';
import Room from '../models/Room.js';
import { inMemoryStore } from './inMemoryStore.js';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const defaultQuestions = [
  {
    id: 1,
    title: 'Binary Search',
    difficulty: 'Medium',
    description: 'Given a sorted array of integers and a target value, return the index of the target if it exists. Otherwise, return -1.',
    constraints: [
      '1 ≤ nums.length ≤ 10,000',
      '-10,000 ≤ nums[i] ≤ 10,000',
      'All elements are unique',
      'nums is sorted in ascending order'
    ],
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4' },
      { input: 'nums = [5], target = 5', output: '0' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 13', output: '-1' }
    ],
    starterCode: 'function search(nums, target) {\n  // write your solution here\n  return -1;\n}'
  },
  {
    id: 2,
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: [
      '1 ≤ s.length ≤ 10,000',
      "s consists of parentheses only '()[]{}' "
    ],
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' }
    ],
    starterCode: 'function isValid(s) {\n  // write your solution here\n  return false;\n}'
  },
  {
    id: 3,
    title: 'Merge Intervals',
    difficulty: 'Hard',
    description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
    constraints: [
      '1 ≤ intervals.length ≤ 10,000',
      'intervals[i].length == 2',
      '0 ≤ starti ≤ endi ≤ 10,000'
    ],
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' }
    ],
    starterCode: 'function merge(intervals) {\n  // write your solution here\n  return intervals;\n}'
  }
];

export async function createRoom({ hostId, hostName, difficulty = 'Medium', timeLimit = '15:00', questions = null }) {
  const roomQuestions = questions || defaultQuestions;

  if (isMongoConnected()) {
    let roomCode;
    let attempts = 0;
    const maxAttempts = 50;
    do {
      roomCode = generateRoomCode();
      attempts++;
    } while (await Room.findOne({ code: roomCode }) && attempts < maxAttempts);

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
      difficulty,
      timeLimit,
      questions: roomQuestions,
      status: 'waiting'
    });

    await room.save();
    return room.toJSON ? room.toJSON() : room;
  }

  return inMemoryStore.createRoom({ hostId, hostName, difficulty, timeLimit, questions: roomQuestions });
}

export async function getRoomByCode(code) {
  if (!code) return null;
  const upperCode = code.toUpperCase();

  if (isMongoConnected()) {
    const room = await Room.findOne({ code: upperCode });
    return room ? (room.toJSON ? room.toJSON() : room) : null;
  }

  return inMemoryStore.getRoom(upperCode);
}

export async function joinRoomByCode(code, playerId, playerName) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  if (isMongoConnected()) {
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

    if (room.hostId === playerId) {
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

  return inMemoryStore.joinRoom(upperCode, playerId, playerName);
}

export async function leaveRoomByCode(code, playerId) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  if (isMongoConnected()) {
    const room = await Room.findOne({ code: upperCode });
    if (!room) {
      const err = new Error('Room not found');
      err.statusCode = 404;
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }

    if (room.hostId === playerId) {
      await Room.deleteOne({ _id: room._id });
    } else if (room.guestId === playerId) {
      room.guestId = null;
      room.guestName = null;
      room.status = 'waiting';
      await room.save();
    }
    return true;
  }

  return inMemoryStore.leaveRoom(upperCode, playerId);
}

export async function startRoomByCode(code) {
  if (!code) {
    const err = new Error('Room code is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const upperCode = code.toUpperCase();

  if (isMongoConnected()) {
    const room = await Room.findOne({ code: upperCode });
    if (!room) {
      const err = new Error('Room not found');
      err.statusCode = 404;
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }

    if (room.status !== 'ready') {
      const err = new Error('Room is not ready. Both players must join first.');
      err.statusCode = 400;
      err.code = 'ROOM_NOT_READY';
      throw err;
    }

    room.status = 'in_progress';
    room.startedAt = new Date();
    await room.save();
    return room.toJSON ? room.toJSON() : room;
  }

  return inMemoryStore.startRoom(upperCode);
}

export default {
  createRoom,
  getRoomByCode,
  joinRoomByCode,
  leaveRoomByCode,
  startRoomByCode
};
