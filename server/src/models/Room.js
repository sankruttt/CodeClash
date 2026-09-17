import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  hostId: {
    type: String,
    required: true,
  },
  hostName: {
    type: String,
    required: true,
  },
  guestId: {
    type: String,
    default: null,
  },
  guestName: {
    type: String,
    default: null,
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null,
  },
  status: {
    type: String,
    enum: ['waiting', 'ready', 'in_progress', 'completed', 'abandoned'],
    default: 'waiting',
  },
  abandonedBy: {
    type: String,
    default: null,
  },
  questions: {
    type: Array,
    default: [],
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  timeLimit: {
    type: String,
    default: '15:00',
  },
  duration: {
    type: Number,
    default: 900, // seconds
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

roomSchema.index({ status: 1 });

roomSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});
roomSchema.set('toObject', { virtuals: true, versionKey: false });

const Room = mongoose.model('Room', roomSchema);
export default Room;
