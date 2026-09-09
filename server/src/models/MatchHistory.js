import mongoose from 'mongoose';

const matchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  opponentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  opponentName: String,
  opponentAvatar: String,
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  score: String,  // e.g. "2-1"
  problemsSolved: { type: Number, default: 0 },
  opponentProblemsSolved: { type: Number, default: 0 },
  ratingChange: { type: Number, default: 0 },
  ratingAfter: Number,
  duration: Number,  // seconds
  matchType: {
    type: String,
    enum: ['ranked', 'casual', 'private']
  },
  problems: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingProblem' },
    title: String,
    difficulty: String,
    solved: Boolean,
    time: Number
  }]
}, {
  timestamps: true
});

matchHistorySchema.index({ userId: 1, createdAt: -1 });

const MatchHistory = mongoose.model('MatchHistory', matchHistorySchema);
export default MatchHistory;
