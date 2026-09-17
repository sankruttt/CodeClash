import User from '../models/User.js';

/**
 * Returns YYYY-MM-DD in UTC
 */
export function toDateKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns calendar day difference between date1 and date2
 */
export function getDayDifference(date1, date2) {
  const [y1, m1, d1] = toDateKey(date1).split('-').map(Number);
  const [y2, m2, d2] = toDateKey(date2).split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Generates 7-day indicators ending on targetDate
 */
export function generateWeeklyIndicators(activityHistory = [], targetDate = new Date()) {
  const historySet = new Set(activityHistory);
  const weekDays = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDate);
    d.setUTCDate(d.getUTCDate() - i);
    const key = toDateKey(d);
    weekDays.push({
      date: key,
      dayName: dayNames[d.getUTCDay()],
      dayLetter: dayNames[d.getUTCDay()][0],
      completed: historySet.has(key),
      isToday: i === 0
    });
  }

  return weekDays;
}

/**
 * Record qualifying activity for a user in MongoDB
 */
export async function recordUserActivity(userId, activityDate = new Date()) {
  if (!userId) return null;

  const todayKey = toDateKey(activityDate);

  const user = await User.findById(userId);
  if (!user) return null;

  let currentStreak = Math.max(0, user.streak || 0);
  let longestStreak = Math.max(0, user.longestStreak || user.bestStreak || 0);
  const history = Array.isArray(user.activityHistory) ? [...user.activityHistory] : [];

  if (!user.lastActivityDate) {
    // First activity
    currentStreak = 1;
    longestStreak = Math.max(longestStreak, 1);
  } else {
    const diff = getDayDifference(user.lastActivityDate, activityDate);

    if (diff === 0) {
      // Same day activity: do not increment streak
      currentStreak = Math.max(1, currentStreak);
    } else if (diff === 1) {
      // Consecutive day
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (diff > 1) {
      // Missed one or more days: reset to 1
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, 1);
    }
  }

  if (!history.includes(todayKey)) {
    history.push(todayKey);
  }

  user.streak = Math.max(0, currentStreak);
  user.longestStreak = Math.max(0, longestStreak);
  user.bestStreak = Math.max(0, longestStreak);
  user.lastActivityDate = activityDate;
  user.activityHistory = history;

  await user.save();

  return {
    streak: Math.max(0, currentStreak),
    longestStreak: Math.max(0, longestStreak),
    todayCompleted: true,
    lastActivityDate: activityDate,
    activityHistory: history,
    weeklyIndicators: generateWeeklyIndicators(history, activityDate)
  };
}

/**
 * Get current streak status for a user from MongoDB
 */
export async function getUserStreak(userId, targetDate = new Date()) {
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  const history = Array.isArray(user.activityHistory) ? user.activityHistory : [];
  const longestStreak = Math.max(0, user.longestStreak || user.bestStreak || 0);
  let streak = Math.max(0, user.streak || 0);
  let todayCompleted = false;

  if (!user.lastActivityDate) {
    streak = 0;
    todayCompleted = false;
  } else {
    const diff = getDayDifference(user.lastActivityDate, targetDate);
    if (diff === 0) {
      todayCompleted = true;
      streak = Math.max(0, user.streak || 0);
    } else if (diff === 1) {
      todayCompleted = false;
      streak = Math.max(0, user.streak || 0);
    } else {
      // Missed days
      todayCompleted = false;
      streak = 0;
    }
  }

  return {
    streak: Math.max(0, streak),
    longestStreak: Math.max(0, longestStreak),
    todayCompleted,
    lastActivityDate: user.lastActivityDate || null,
    activityHistory: history,
    weeklyIndicators: generateWeeklyIndicators(history, targetDate)
  };
}

export default {
  toDateKey,
  getDayDifference,
  generateWeeklyIndicators,
  recordUserActivity,
  getUserStreak
};
