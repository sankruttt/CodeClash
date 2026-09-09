import mongoose from 'mongoose';

const playerStatisticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  username: String,
  
  // Overall stats
  totalMatches: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  totalDraws: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },  // percentage
  
  // Rating
  currentRating: { type: Number, default: 1500 },
  peakRating: { type: Number, default: 1500 },
  ratingHistory: [{
    rating: Number,
    change: Number,
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    date: { type: Date, default: Date.now }
  }],
  
  // Streaks
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  
  // Problem solving
  problemsAttempted: { type: Number, default: 0 },
  problemsSolved: { type: Number, default: 0 },
  solveRate: { type: Number, default: 0 },
  
  // By difficulty
  easySolved: { type: Number, default: 0 },
  mediumSolved: { type: Number, default: 0 },
  hardSolved: { type: Number, default: 0 },
  
  // Time stats
  avgSolveTime: { type: Number, default: 0 },
  fastestSolve: { type: Number, default: 0 },
  
  // Languages
  languageStats: {
    javascript: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
    python: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
    typescript: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
    java: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } }
  },
  
  // Tags
  tagStats: {
    type: Map,
    of: {
      solved: Number,
      attempted: Number
    }
  },
  
  // Ranking
  globalRank: { type: Number, default: 0 },
  seasonPoints: { type: Number, default: 0 },
  
  // Activity
  lastMatchAt: Date,
  totalPlayTime: { type: Number, default: 0 }  // minutes
}, {
  timestamps: true
});

playerStatisticsSchema.index({ currentRating: -1 });
playerStatisticsSchema.index({ totalWins: -1 });

const PlayerStatistics = mongoose.model('PlayerStatistics', playerStatisticsSchema);
export default PlayerStatistics;
