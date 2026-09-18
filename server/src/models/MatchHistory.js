import mongoose from 'mongoose';

const matchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Match',
    required: false
  },
  opponentId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },
  opponentName: String,
  opponentAvatar: String,
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  outcome: {
    type: String,
    enum: ['completed', 'abandoned'],
    default: 'completed'
  },
  forfeit: {
    type: Boolean,
    default: false
  },
  score: String,  // e.g. "2-1"
  problemsSolved: { type: Number, default: 0 },
  opponentProblemsSolved: { type: Number, default: 0 },
  ratingChange: { type: Number, default: 0 },
  ratingAfter: Number,
  duration: Number,  // seconds
  solveTime: Number,  // seconds taken to finish all solved problems
  language: String,  // language used for the solved problem(s)
  matchType: {
    type: String,
    default: 'ranked'
  },
  problemTitle: String,
  difficulty: String,
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  problems: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' },
    title: String,
    difficulty: String,
    solved: Boolean,
    time: Number,
    language: String
  }]
}, {
  timestamps: true
});

matchHistorySchema.index({ userId: 1, createdAt: -1 });

const MatchHistory = mongoose.model('MatchHistory', matchHistorySchema);
export default MatchHistory;
