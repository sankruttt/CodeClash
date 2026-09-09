import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory storage for rooms and matches
const rooms = new Map();
const matches = new Map();
const players = new Map();

// Generate a 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Battle questions
const battleQuestions = [
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
    starterCode: `function search(nums, target) {\n  // write your solution here\n  return -1;\n}`
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
      { input: 's = \"()\"', output: 'true' },
      { input: 's = \"()[]{}\"', output: 'true' },
      { input: 's = \"(]\"', output: 'false' }
    ],
    starterCode: `function isValid(s) {\n  // write your solution here\n  return false;\n}`
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
    starterCode: `function merge(intervals) {\n  // write your solution here\n  return intervals;\n}`
  }
];

// ============== ROOM ENDPOINTS ==============

// Create a new private room
app.post('/api/rooms/create', (req, res) => {
  const { hostId, hostName } = req.body;
  
  if (!hostId || !hostName) {
    return res.status(400).json({ error: 'Host ID and name are required' });
  }

  let roomCode = generateRoomCode();
  // Ensure unique room code
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const room = {
    code: roomCode,
    hostId,
    hostName,
    guestId: null,
    guestName: null,
    status: 'waiting', // waiting, ready, in_progress, completed
    questions: battleQuestions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  rooms.set(roomCode, room);
  
  console.log(`Room created: ${roomCode} by ${hostName}`);
  res.json({ room });
});

// Join a room by code
app.post('/api/rooms/join', (req, res) => {
  const { roomCode, playerId, playerName } = req.body;
  
  if (!roomCode || !playerId || !playerName) {
    return res.status(400).json({ error: 'Room code, player ID, and name are required' });
  }

  const room = rooms.get(roomCode.toUpperCase());
  
  console.log(`Join attempt - Room: ${roomCode}, Player: ${playerName} (${playerId}), Current status: ${room?.status}`);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Room is no longer accepting players' });
  }

  if (room.hostId === playerId) {
    return res.status(400).json({ error: 'Cannot join your own room' });
  }

  // Update room with guest
  room.guestId = playerId;
  room.guestName = playerName;
  room.status = 'ready';
  room.updatedAt = new Date().toISOString();

  rooms.set(roomCode.toUpperCase(), room);
  
  console.log(`${playerName} (${playerId}) joined room ${roomCode} - Room status is now: ${room.status}`);
  res.json({ room });
});

// Get room status
app.get('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({ room });
});

// Leave a room
app.post('/api/rooms/:code/leave', (req, res) => {
  const { code } = req.params;
  const { playerId } = req.body;
  const room = rooms.get(code.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.hostId === playerId) {
    // Host leaving - delete room
    rooms.delete(code.toUpperCase());
    console.log(`Room ${code} deleted by host`);
  } else if (room.guestId === playerId) {
    // Guest leaving - reset room to waiting
    room.guestId = null;
    room.guestName = null;
    room.status = 'waiting';
    room.updatedAt = new Date().toISOString();
    rooms.set(code.toUpperCase(), room);
    console.log(`Player left room ${code}`);
  }

  res.json({ success: true });
});

// Start the battle
app.post('/api/rooms/:code/start', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code.toUpperCase());
  
  console.log(`Start battle requested for room ${code}, current status: ${room?.status}`);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.status !== 'ready') {
    return res.status(400).json({ error: 'Room is not ready. Both players must join first.' });
  }

  room.status = 'in_progress';
  room.startedAt = new Date().toISOString();
  room.updatedAt = new Date().toISOString();
  rooms.set(code.toUpperCase(), room);

  console.log(`Battle started in room ${code}`);
  res.json({ room });
});

// ============== MATCH ENDPOINTS ==============

// Create a match record
app.post('/api/matches/create', (req, res) => {
  const { roomCode, player1, player2, questions } = req.body;
  
  const matchId = uuidv4();
  const match = {
    id: matchId,
    roomCode,
    players: [
      { ...player1, solved: [], totalTime: 0 },
      { ...player2, solved: [], totalTime: 0 }
    ],
    questions,
    status: 'in_progress',
    winner: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  matches.set(matchId, match);
  
  console.log(`Match created: ${matchId} in room ${roomCode}`);
  res.json({ match });
});

// Update player progress
app.post('/api/matches/:id/progress', (req, res) => {
  const { id } = req.params;
  const { playerId, questionIndex, time } = req.body;
  const match = matches.get(id);
  
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  const player = match.players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found in match' });
  }

  // Mark question as solved
  if (!player.solved.includes(questionIndex)) {
    player.solved.push(questionIndex);
  }
  player.totalTime = time;

  matches.set(id, match);
  res.json({ match });
});

// Complete a match
app.post('/api/matches/:id/complete', (req, res) => {
  const { id } = req.params;
  const { winner, scores } = req.body;
  const match = matches.get(id);
  
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  match.status = 'completed';
  match.winner = winner;
  match.completedAt = new Date().toISOString();
  match.finalScores = scores;

  matches.set(id, match);
  
  console.log(`Match ${id} completed. Winner: ${winner}`);
  res.json({ match });
});

// Get match status
app.get('/api/matches/:id', (req, res) => {
  const { id } = req.params;
  const match = matches.get(id);
  
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  res.json({ match });
});

// ============== PLAYER ENDPOINTS ==============

// Register a player (create/update)
app.post('/api/players/register', (req, res) => {
  const { id, name, rating = 1500 } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({ error: 'Player ID and name are required' });
  }

  const player = {
    id,
    name,
    rating,
    wins: 0,
    losses: 0,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  players.set(id, player);
  
  console.log(`Player registered: ${name} (${id})`);
  res.json({ player });
});

// Get player profile
app.get('/api/players/:id', (req, res) => {
  const { id } = req.params;
  const player = players.get(id);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json({ player });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    rooms: rooms.size,
    matches: matches.size,
    players: players.size,
    roomDetails: Array.from(rooms.values()).map(r => ({
      code: r.code,
      hostId: r.hostId,
      guestId: r.guestId,
      status: r.status
    }))
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 CodeClash server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
