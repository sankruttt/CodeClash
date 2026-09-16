import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false  // Don't return password by default
  },
  avatar: {
    type: String,
    default: 'PL'
  },
  color: {
    type: String,
    enum: ['coral', 'gold', 'blue', 'green'],
    default: 'gold'
  },
  rating: {
    type: Number,
    default: 1500
  },
  rank: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  activityHistory: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving (async/await style for Mongoose 9)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Public profile (no password)
userSchema.methods.toPublicJSON = function () {
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastActiveStr = this.lastActivityDate ? new Date(this.lastActivityDate).toISOString().slice(0, 10) : null;
  const todayCompleted = lastActiveStr === todayStr;

  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    color: this.color,
    rating: this.rating,
    rank: this.rank,
    wins: this.wins,
    losses: this.losses,
    draws: this.draws,
    streak: this.streak || 0,
    bestStreak: this.longestStreak || this.bestStreak || 0,
    longestStreak: this.longestStreak || this.bestStreak || 0,
    lastActivityDate: this.lastActivityDate || null,
    activityHistory: this.activityHistory || [],
    todayCompleted
  };
};

const User = mongoose.model('User', userSchema);
export default User;
