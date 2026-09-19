import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import { assertEmailVerified } from './otpService.js';

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

export async function registerUser({ username, email, password, avatar, primaryStack, emailVerifiedToken }) {
  // The combatant's email must have been verified server-side first. The
  // only way to get this token is a successful OTP verify (single-use,
  // purpose-scoped, short-TTL) — register refuses to mint an account on a
  // guess.
  assertEmailVerified({ email, emailVerifiedToken });

  // Check if user already exists (account creation is the final gate, so an
  // email can only ever become ONE account even if the OTP flow was replayed).
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

  const user = await User.create({
    username,
    email,
    password,
    avatar: avatar || username.slice(0, 2).toUpperCase(),
    primaryStack: primaryStack || 'Python'
  });

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

  // Calculate initial rank
  const higherCount = await User.countDocuments({ rating: { $gt: user.rating } });
  const userJson = user.toPublicJSON();
  userJson.rank = higherCount + 1;

  const token = generateToken(user);
  return {
    user: userJson,
    token
  };
}

export async function loginUser({ email, password }) {
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

  // Compute live rank
  const higherCount = await User.countDocuments({ rating: { $gt: user.rating } });
  const userJson = user.toPublicJSON();
  userJson.rank = higherCount + 1;

  const token = generateToken(user);
  return {
    user: userJson,
    token
  };
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) return null;

  // Compute live MongoDB rank against entire dataset
  const higherCount = await User.countDocuments({ rating: { $gt: user.rating } });
  const userJson = user.toPublicJSON();
  userJson.rank = higherCount + 1;

  return userJson;
}

export async function updateUserProfile(userId, { name, username, primaryStack }) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const trimmedUsername = typeof username === 'string' ? username.trim() : undefined;
  const trimmedName = typeof name === 'string' ? name.trim() : undefined;

  // Check username uniqueness if changed (case-insensitive)
  if (trimmedUsername && trimmedUsername.toLowerCase() !== user.username.toLowerCase()) {
    const escaped = trimmedUsername.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const existing = await User.findOne({
      _id: { $ne: user._id },
      username: { $regex: new RegExp(`^${escaped}$`, 'i') }
    });

    if (existing) {
      const error = new Error('Username is already taken');
      error.statusCode = 409;
      error.code = 'USERNAME_TAKEN';
      throw error;
    }

    user.username = trimmedUsername;

    // Sync username to PlayerStatistics in MongoDB
    await PlayerStatistics.updateOne(
      { userId: user._id },
      { $set: { username: trimmedUsername } }
    );
  }

  if (trimmedName !== undefined) {
    user.name = trimmedName;
  }

  if (primaryStack !== undefined) {
    const validStacks = ['C', 'C++', 'Java', 'JavaScript', 'Python'];
    if (validStacks.includes(primaryStack)) {
      user.primaryStack = primaryStack;
    }
  }

  // Update avatar initials if avatar is standard 2-char representation
  if (trimmedUsername || trimmedName) {
    const initialSource = trimmedName || trimmedUsername || user.username;
    if (!user.avatar || user.avatar.length <= 2) {
      user.avatar = initialSource.slice(0, 2).toUpperCase();
    }
  }

  await user.save();

  // Compute live rank
  const higherCount = await User.countDocuments({ rating: { $gt: user.rating } });
  const userJson = user.toPublicJSON();
  userJson.rank = higherCount + 1;

  // Generate fresh token with updated username
  const token = generateToken(user);

  return {
    user: userJson,
    token
  };
}

export default { registerUser, loginUser, getUserById, updateUserProfile };
