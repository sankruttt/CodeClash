import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 1500
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

playerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret.playerId || ret._id;
    delete ret._id;
    return ret;
  }
});

const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
export default Player;
