import jwt from 'jsonwebtoken';
import { isMongoConnected } from '../config/database.js';
import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import { inMemoryStore } from './inMemoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function registerUser({ username, email, password, avatar }) {
  if (isMongoConnected()) {
    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      const error = new Error(`${field} already in use`);
      error.statusCode = 409;
      error.code = 'USER_EXISTS';
      throw error;
    }
    
    const user = await User.create({ username, email, password, avatar: avatar || username.slice(0, 2).toUpperCase() });

    try {
      await PlayerStatistics.create({
        userId: user._id,
        username: user.username,
        currentRating: user.rating,
        peakRating: user.rating
      });
    } catch (statsError) {
      // Rollback: delete the user if stats creation fails
      await User.findByIdAndDelete(user._id);
      const err = new Error('Failed to create user profile');
      err.statusCode = 500;
      err.code = 'PROFILE_CREATION_FAILED';
      throw err;
    }
    
    const token = generateToken(user);
    return {
      user: user.toPublicJSON(),
      token
    };
  } else {
    // In-memory fallback
    return inMemoryStore.createUser({ username, email, password, avatar });
  }
}

export async function loginUser({ email, password }) {
  if (isMongoConnected()) {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }
    
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken(user);
    return {
      user: user.toPublicJSON(),
      token
    };
  } else {
    return inMemoryStore.loginUser({ email, password });
  }
}

export async function getUserById(id) {
  if (isMongoConnected()) {
    const user = await User.findById(id);
    if (!user) return null;
    return user.toPublicJSON();
  } else {
    return inMemoryStore.getUser(id);
  }
}

export default { registerUser, loginUser, getUserById };
