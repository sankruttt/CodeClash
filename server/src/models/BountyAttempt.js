import mongoose from 'mongoose';

// Daily Algorithmic Bounty attempt — one attempt per user per calendar day.
// A user can only START a bounty once a day; once that attempt settles
// (solved / DNF / abandoned) it is locked until the next day rolls over.
const bountyAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  day: {
    type: String, // 'YYYY-MM-DD' (UTC) that this attempt belongs to
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED'],
    default: 'IN_PROGRESS'
  },
  solved: {
    type: Boolean,
    default: false
  },
  reward: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Enforce the one-attempt-per-day rule at the database level.
bountyAttemptSchema.index({ userId: 1, day: 1 }, { unique: true });

bountyAttemptSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  }
});
bountyAttemptSchema.set('toObject', { virtuals: true, versionKey: false });

const BountyAttempt = mongoose.model('BountyAttempt', bountyAttemptSchema);
export default BountyAttempt;