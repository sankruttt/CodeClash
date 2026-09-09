// In-memory storage fallback when MongoDB is not available
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

class InMemoryStore {
  constructor() {
    this.users = new Map();
    this.matches = new Map();
    this.problems = new Map();
    this.testCases = new Map();
    this.submissions = new Map();
    this.statistics = new Map();
    this.history = new Map();
    this.leaderboard = new Map();
    this.matchmakingQueue = [];
    this.idCounter = 1;
    
    this.seedDefaultProblems();
  }

  async seedDefaultUsers() {
    const defaults = [
      { username: 'alice', email: 'alice@codeclash.com', password: 'Alice123', avatar: 'AL', color: 'coral', rating: 2150, wins: 45, losses: 12, streak: 8 },
      { username: 'bob', email: 'bob@codeclash.com', password: 'Bob12345', avatar: 'BO', color: 'blue', rating: 1980, wins: 32, losses: 18, streak: 3 },
      { username: 'charlie', email: 'charlie@codeclash.com', password: 'Charlie123', avatar: 'CH', color: 'green', rating: 2350, wins: 67, losses: 8, streak: 12 }
    ];

    for (const userData of defaults) {
      if (this.getUserByEmail(userData.email)) continue;
      const { user } = await this.createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        avatar: userData.avatar
      });
      this.updateUser(user.id, {
        color: userData.color,
        rating: userData.rating,
        wins: userData.wins,
        losses: userData.losses,
        streak: userData.streak
      });
      this.updateStatistics(user.id, {
        currentRating: userData.rating,
        peakRating: userData.rating,
        totalWins: userData.wins,
        totalLosses: userData.losses,
        totalMatches: userData.wins + userData.losses,
        currentStreak: userData.streak,
        bestStreak: Math.max(0, userData.streak),
        winRate: Math.round((userData.wins / (userData.wins + userData.losses)) * 100)
      });
    }
  }
  
  generateId() {
    return (this.idCounter++).toString().padStart(24, '0');
  }
  
  generateToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
  
  // ============ USERS ============
  
  async createUser({ username, email, password, avatar }) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        const err = new Error('email already in use');
        err.statusCode = 409;
        err.code = 'USER_EXISTS';
        throw err;
      }
      if (user.username === username) {
        const err = new Error('username already taken');
        err.statusCode = 409;
        err.code = 'USER_EXISTS';
        throw err;
      }
    }
    
    const id = this.generateId();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = {
      id,
      username,
      email,
      password: hashedPassword,
      avatar: avatar || username.slice(0, 2).toUpperCase(),
      color: 'gold',
      rating: 1500,
      rank: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
      lastLogin: new Date(),
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    
    // Initialize statistics
    this.statistics.set(id, {
      userId: id,
      username,
      totalMatches: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      currentRating: 1500,
      peakRating: 1500,
      currentStreak: 0,
      bestStreak: 0,
      problemsAttempted: 0,
      problemsSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      globalRank: 0,
      seasonPoints: 0,
      lastMatchAt: null
    });
    
    const { password: _, ...publicUser } = user;
    return {
      user: publicUser,
      token: this.generateToken(user)
    };
  }
  
  async loginUser({ email, password }) {
    let foundUser = null;
    for (const user of this.users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }
    
    if (!foundUser) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
    
    const isValid = await bcrypt.compare(password, foundUser.password);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
    
    foundUser.lastLogin = new Date();
    const { password: _, ...publicUser } = foundUser;
    return {
      user: publicUser,
      token: this.generateToken(foundUser)
    };
  }
  
  getUser(id) {
    const user = this.users.get(id);
    if (!user) return null;
    const { password, ...publicUser } = user;
    return publicUser;
  }
  
  getUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
  
  getAllUsers() {
    return Array.from(this.users.values()).map(({ password, ...user }) => user);
  }
  
  updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    // Allowlist: only update safe fields, never allow id/password overwrite
    const allowedFields = ['color', 'rating', 'rank', 'wins', 'losses', 'draws', 'streak', 'bestStreak', 'avatar', 'lastLogin'];
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    }
    return user;
  }
  
  // ============ PROBLEMS ============
  
  seedDefaultProblems() {
    const problems = [
      {
        id: '1',
        title: 'Binary Search',
        difficulty: 'Medium',
        description: 'Given a sorted array of integers and a target value, return the index of the target if it exists. Otherwise, return -1.',
        constraints: ['1 ≤ nums.length ≤ 10,000', '-10,000 ≤ nums[i] ≤ 10,000', 'All elements are unique', 'nums is sorted in ascending order'],
        examples: [
          { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4' },
          { input: 'nums = [5], target = 5', output: '0' },
          { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 13', output: '-1' }
        ],
        starterCode: {
          javascript: 'function search(nums, target) {\n  // write your solution here\n  return -1;\n}',
          python: 'def search(nums, target):\n    # write your solution here\n    return -1'
        },
        tags: ['Algorithms', 'Array', 'Binary Search'],
        timeLimit: 60,
        memoryLimit: 256,
        points: 100,
        isActive: true
      },
      {
        id: '2',
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        constraints: ['1 ≤ s.length ≤ 10,000', "s consists of parentheses only '()[]{}'"],
        examples: [
          { input: 's = "()"', output: 'true' },
          { input: 's = "()[]{}"', output: 'true' },
          { input: 's = "(]"', output: 'false' }
        ],
        starterCode: {
          javascript: 'function isValid(s) {\n  // write your solution here\n  return false;\n}',
          python: 'def isValid(s):\n    # write your solution here\n    return False'
        },
        tags: ['Data Structures', 'Stack', 'String'],
        timeLimit: 30,
        memoryLimit: 256,
        points: 80,
        isActive: true
      },
      {
        id: '3',
        title: 'Merge Intervals',
        difficulty: 'Hard',
        description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
        constraints: ['1 ≤ intervals.length ≤ 10,000', 'intervals[i].length == 2', '0 ≤ starti ≤ endi ≤ 10,000'],
        examples: [
          { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
          { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' }
        ],
        starterCode: {
          javascript: 'function merge(intervals) {\n  // write your solution here\n  return intervals;\n}',
          python: 'def merge(intervals):\n    # write your solution here\n    return intervals'
        },
        tags: ['Algorithms', 'Array', 'Sorting'],
        timeLimit: 90,
        memoryLimit: 256,
        points: 150,
        isActive: true
      }
    ];
    
    problems.forEach(p => this.problems.set(p.id, p));
  }
  
  getAllProblems() {
    return Array.from(this.problems.values());
  }
  
  getProblem(id) {
    return this.problems.get(id);
  }
  
  getRandomProblems(count = 3) {
    const all = Array.from(this.problems.values());
    // Fisher-Yates shuffle for uniform randomness
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
  }
  
  // ============ MATCHES ============
  
  createMatch(matchData) {
    const id = this.generateId();
    const match = {
      id,
      ...matchData,
      createdAt: new Date()
    };
    this.matches.set(id, match);
    return match;
  }
  
  getMatch(id) {
    return this.matches.get(id);
  }
  
  updateMatch(id, updates) {
    const match = this.matches.get(id);
    if (!match) return null;
    Object.assign(match, updates);
    return match;
  }
  
  getMatchByRoomCode(code) {
    for (const match of this.matches.values()) {
      if (match.roomCode === code.toUpperCase()) return match;
    }
    return null;
  }
  
  getUserMatches(userId) {
    return Array.from(this.matches.values()).filter(m => 
      m.players && m.players.some(p => p.userId === userId)
    );
  }
  
  // ============ SUBMISSIONS ============
  
  createSubmission(data) {
    const id = this.generateId();
    const submission = { id, ...data, createdAt: new Date() };
    this.submissions.set(id, submission);
    return submission;
  }
  
  getSubmissionsByMatch(matchId) {
    return Array.from(this.submissions.values()).filter(s => s.matchId === matchId);
  }
  
  // ============ STATISTICS ============
  
  getStatistics(userId) {
    return this.statistics.get(userId);
  }
  
  updateStatistics(userId, updates) {
    const stats = this.statistics.get(userId);
    if (!stats) return null;
    Object.assign(stats, updates);
    return stats;
  }
  
  // ============ HISTORY ============
  
  addHistory(data) {
    const id = this.generateId();
    const entry = { id, ...data, createdAt: new Date() };
    if (!this.history.has(data.userId)) {
      this.history.set(data.userId, []);
    }
    this.history.get(data.userId).push(entry);
    return entry;
  }
  
  getUserHistory(userId) {
    return this.history.get(userId) || [];
  }
  
  // ============ LEADERBOARD ============
  
  getLeaderboard(limit = 100, sortBy = 'rating') {
    const comparators = {
      wins: (a, b) => b.totalWins - a.totalWins,
      winrate: (a, b) => b.winRate - a.winRate,
      streak: (a, b) => b.currentStreak - a.currentStreak,
      rating: (a, b) => b.currentRating - a.currentRating
    };
    const compare = comparators[sortBy] || comparators.rating;

    return Array.from(this.statistics.values())
      .sort(compare)
      .slice(0, limit)
      .map((stats, i) => ({
        rank: i + 1,
        userId: stats.userId,
        username: stats.username,
        rating: stats.currentRating,
        wins: stats.totalWins,
        losses: stats.totalLosses,
        winRate: stats.winRate,
        streak: stats.currentStreak
      }));
  }
  
  // ============ MATCHMAKING QUEUE ============
  
  addToQueue(userId) {
    // Check if already in queue
    if (this.matchmakingQueue.some(e => e.userId === userId)) {
      const err = new Error('Already in matchmaking queue');
      err.statusCode = 409;
      err.code = 'ALREADY_IN_QUEUE';
      throw err;
    }
    
    // Check if already in a match
    const activeMatch = this.getUserMatches(userId).find(m => 
      m.status === 'WAITING' || m.status === 'MATCHED' || m.status === 'ACTIVE'
    );
    if (activeMatch) {
      const err = new Error('Already in an active match');
      err.statusCode = 409;
      err.code = 'IN_MATCH';
      throw err;
    }
    
    this.matchmakingQueue.push({ userId, joinedAt: new Date() });
    return true;
  }
  
  removeFromQueue(userId) {
    const index = this.matchmakingQueue.findIndex(e => e.userId === userId);
    if (index > -1) {
      this.matchmakingQueue.splice(index, 1);
      return true;
    }
    return false;
  }
  
  findOpponent(userId) {
    const opponent = this.matchmakingQueue.find(e => e.userId !== userId);
    return opponent || null;
  }
  
  getQueuePosition(userId) {
    const index = this.matchmakingQueue.findIndex(e => e.userId === userId);
    return index === -1 ? -1 : index + 1;
  }
}

export const inMemoryStore = new InMemoryStore();
export default inMemoryStore;
