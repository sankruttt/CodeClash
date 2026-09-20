import mongoose from 'mongoose';

/**
 * Durable matchmaking queue persisted in MongoDB.
 *
 * Unlike an in-memory array, this survives cold starts and is shared across
 * all serverless (e.g. Vercel) instances, so two players queuing at the same
 * time can find each other even when their HTTP requests land on different
 * instances.
 *
 * One entry per user (unique `userId`). `joinedAt` bounds how long a user can
 * wait before being considered stale; a TTL index auto-purges abandoned
 * entries (e.g. a user who closed the tab mid-queue).
 *
 * Pairing is done atomically: `findMatch` flips its OWN entry to `matching`
 * first, then claims an available `queued` opponent, so two concurrent
 * `findMatch` calls can never both create a match for the same two users.
 */
const matchmakingQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['queued', 'matching'],
      default: 'queued'
    },
    questionCount: {
      type: Number,
      default: 1
    },
    duration: {
      type: Number,
      default: 10
    },
    durationSeconds: {
      type: Number,
      default: 600
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    matchedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One active queue slot per user (unique enforced via the field-level option)

// Ready-to-match lookup + FIFO ordering
matchmakingQueueSchema.index({ status: 1, joinedAt: 1 });

// TTL safety net: purge abandoned queue entries ~90s after they joined
matchmakingQueueSchema.index({ joinedAt: 1 }, { expireAfterSeconds: 90 });

const MatchmakingQueue = mongoose.model('MatchmakingQueue', matchmakingQueueSchema);

export default MatchmakingQueue;