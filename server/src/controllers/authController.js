import { registerUser, loginUser, getUserById, updateUserProfile } from '../services/authService.js';
import { getUserStreak } from '../services/streakService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, avatar } = req.body;

  const result = await registerUser({ username, email, password, avatar });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await loginUser({ email, password });

  res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  const streakData = await getUserStreak(req.user.id);
  const enrichedUser = {
    ...user,
    ...(streakData ? {
      streak: streakData.streak,
      longestStreak: streakData.longestStreak,
      todayCompleted: streakData.todayCompleted,
      lastActivityDate: streakData.lastActivityDate,
      activityHistory: streakData.activityHistory,
      weeklyIndicators: streakData.weeklyIndicators
    } : {})
  };

  res.json({
    success: true,
    data: { user: enrichedUser }
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  const { name, username, primaryStack } = req.body;

  const result = await updateUserProfile(userId, { name, username, primaryStack });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: result
  });
});

export const getStreak = asyncHandler(async (req, res) => {
  const streak = await getUserStreak(req.user.id);

  if (!streak) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: streak
  });
});

export default { register, login, getProfile, updateProfile, getStreak };
