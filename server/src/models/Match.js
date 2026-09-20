import mongoose from 'mongoose';

const playerResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  username: String,
  avatar: String,
  ratingBefore: Number,
  ratingAfter: Number,
  ratingChange: { type: Number, default: 0 },
  pointsAwarded: { type: Number, default: 0 },
  completionTime: { type: Number, default: 0 },  // seconds from match start
  totalTime: { type: Number, default: 0 },  // seconds
  problemsSolved: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['WAITING', 'MATCHED', 'ACTIVE', 'FINISHED', 'DISCONNECTED'],
    default: 'WAITING'
  },
  problemResults: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' },
    solved: { type: Boolean, default: false },
    time: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    language: String
  }]
}, { _id: false });

const matchSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['ranked', 'casual', 'private', 'scrimmage', 'bounty'],
    default: 'ranked'
  },
  status: {
    type: String,
    enum: ['WAITING', 'MATCHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ABANDONED'],
    default: 'WAITING'
  },
  players: [playerResultSchema],
  problems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem'
  }],
  questionCount: {
    type: Number,
    enum: [1, 2, 3],
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  timeLimit: {
    type: String,
    default: '15:00'
  },
  winner: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  winnerId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isDraw: {
    type: Boolean,
    default: false
  },
  abandonedBy: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  rewardsAwarded: {
    type: Boolean,
    default: false
  },
  rewardDetails: {
    type: Object,
    default: null
  },
  result: {
    type: String,
    enum: ['player1', 'player2', 'draw', 'cancelled', 'abandoned'],
    default: null
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number,  // seconds
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

matchSchema.index({ roomCode: 1 });
matchSchema.index({ status: 1, createdAt: -1 });
matchSchema.index({ 'players.userId': 1 });

matchSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  }
});
matchSchema.set('toObject', { virtuals: true, versionKey: false });

const Match = mongoose.model('Match', matchSchema);
export default Match;
