import mongoose from 'mongoose';

const playerResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  avatar: String,
  ratingBefore: Number,
  ratingAfter: Number,
  ratingChange: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 },  // seconds
  problemsSolved: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
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
    score: { type: Number, default: 0 }
  }]
}, { _id: false });

const matchSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['ranked', 'casual', 'private'],
    default: 'ranked'
  },
  status: {
    type: String,
    enum: ['WAITING', 'MATCHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'WAITING'
  },
  players: [playerResultSchema],
  problems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem'
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  result: {
    type: String,
    enum: ['player1', 'player2', 'draw', 'cancelled'],
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
