const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3001/api';

// Token Storage Keys
const TOKEN_KEY = 'codeclash_token';
const USER_KEY = 'codeclash_user';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      clearAuthToken();
    }
  } catch (err) {
    console.error('Failed to store auth token:', err);
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to clear auth token:', err);
  }
}

// Helper for fetch with authentication & error handling
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMsg =
        (data?.details && Array.isArray(data.details) && data.details.length > 0
          ? data.details.map((d) => d.message || d).join('. ')
          : null) ||
        (data?.message && data.message !== 'Invalid request data' ? data.message : null) ||
        data?.error?.message ||
        (typeof data?.error === 'string' ? data.error : null) ||
        data?.message ||
        `API request failed with status ${response.status}`;

      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error.message);
    throw error;
  }
}

// ============== AUTH APIs ==============
export const authAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: ({ username, email, password, avatar }) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, avatar }),
    }),

  getMe: () => apiRequest('/auth/me'),

  updateProfile: ({ name, username, primaryStack }) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, username, primaryStack }),
    }),

  getStreak: () => apiRequest('/auth/streak'),
};

// ============== ROOM APIs ==============
export const roomAPI = {
  createRoom: (hostId, hostName, difficulty = 'Medium', timeLimit = '10:00', duration = 600) => {
    let durSec = duration;
    if (typeof durSec === 'number' && [5, 10, 15].includes(durSec)) durSec *= 60;
    const normalizedTime = typeof timeLimit === 'number' ? `${timeLimit < 10 ? '0' : ''}${timeLimit}:00` : timeLimit;
    return apiRequest('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({
        hostId,
        hostName,
        difficulty,
        timeLimit: normalizedTime,
        duration: durSec || (normalizedTime === '05:00' ? 300 : normalizedTime === '10:00' ? 600 : 900)
      }),
    });
  },

  joinRoom: (roomCode, playerId, playerName) =>
    apiRequest('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, playerId, playerName }),
    }),

  getRoom: (code) =>
    apiRequest(`/rooms/${code}`),

  leaveRoom: (code, playerId) =>
    apiRequest(`/rooms/${code}/leave`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),

  startBattle: (code, userId) =>
    apiRequest(`/rooms/${code}/start`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  updateSettings: (code, { difficulty, timeLimit, duration, hostId }) =>
    apiRequest(`/rooms/${code}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ difficulty, timeLimit, duration, hostId }),
    }),

  abandonRoom: (code, playerId) =>
    apiRequest(`/rooms/${code}/abandon`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),
};

// ============== MATCH APIs ==============
export const matchAPI = {
  createMatch: (roomCodeOrPayload, player1, player2, questions) => {
    const payload = typeof roomCodeOrPayload === 'object' && roomCodeOrPayload !== null
      ? roomCodeOrPayload
      : { roomCode: roomCodeOrPayload, player1, player2, questions };
    return apiRequest('/matches/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createRankedMatch: (type = 'ranked') =>
    apiRequest('/matches', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  updateProgress: (matchId, playerId, questionIndex, time) =>
    apiRequest(`/matches/${matchId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ playerId, questionIndex, time }),
    }),

  completeMatch: (matchId, winner, scores) =>
    apiRequest(`/matches/${matchId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ winner, scores }),
    }),

  abandonMatch: (matchId, playerId, extra = {}) =>
    apiRequest(`/matches/${matchId}/abandon`, {
      method: 'POST',
      body: JSON.stringify({ playerId, ...extra }),
    }),

  getMatch: (id) =>
    apiRequest(`/matches/${id}`),

  getMatches: () =>
    apiRequest('/matches'),
};

// ============== MATCHMAKING APIs ==============
export const matchmakingAPI = {
  joinQueue: (config = {}) =>
    apiRequest('/matchmaking/join', {
      method: 'POST',
      body: JSON.stringify({
        questionCount: config?.questionCount ?? 1,
        duration: config?.duration ?? 10
      }),
    }),

  leaveQueue: () =>
    apiRequest('/matchmaking/leave', {
      method: 'POST',
    }),

  getStatus: () =>
    apiRequest('/matchmaking/status'),
};

// ============== PROBLEM APIs ==============
export const problemAPI = {
  getProblems: () =>
    apiRequest('/problems'),

  getProblemById: (id) =>
    apiRequest(`/problems/${id}`),

  getRandomProblems: (count = 1, difficulty = '') => {
    let url = `/problems/random?count=${count}`;
    if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
    return apiRequest(url);
  },
};

// ============== LEADERBOARD & STATS APIs ==============
export const leaderboardAPI = {
  getLeaderboard: ({ page = 1, limit = 20, sortBy = 'rating', stack = '', search = '' } = {}) => {
    let url = `/leaderboard?page=${page}&limit=${limit}&sortBy=${sortBy}`;
    if (stack && stack !== 'All Stacks') url += `&stack=${encodeURIComponent(stack)}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    return apiRequest(url);
  },

  getMeRank: () => {
    if (!getAuthToken()) {
      return Promise.resolve({ success: false, data: null });
    }
    return apiRequest('/leaderboard/me');
  },

  getUserRank: (userId) => {
    if (!userId || String(userId).startsWith('user_')) {
      return Promise.resolve({ success: false, data: { rank: null } });
    }
    return apiRequest(`/leaderboard/rank/${userId}`);
  },

  getMatchHistory: (limit = 50) => {
    if (!getAuthToken()) {
      return Promise.resolve({ success: false, data: { history: [], count: 0 } });
    }
    return apiRequest(`/leaderboard/history/me?limit=${limit}`);
  },
};

// ============== PLAYER APIs (COMPATIBILITY) ==============
export const playerAPI = {
  register: (id, name, rating = 1500) =>
    apiRequest('/players/register', {
      method: 'POST',
      body: JSON.stringify({ id, name, rating }),
    }),

  getPlayer: (id) =>
    apiRequest(`/players/${id}`),
};

// ============== COMPILER & EXECUTION APIs ==============
export const compilerAPI = {
  runCode: (code, language = 'javascript', stdin = '', testCases = []) =>
    apiRequest('/submissions/run', {
      method: 'POST',
      body: JSON.stringify({ code, language, stdin, testCases }),
    }),

  submitCode: (matchId, problemId, code, language = 'javascript', playerId) =>
    apiRequest('/submissions', {
      method: 'POST',
      body: JSON.stringify({ matchId, problemId, code, language, playerId }),
    }),

  getSubmissionsByMatch: (matchId, playerId) =>
    apiRequest(`/submissions/match/${matchId}${playerId ? `?playerId=${playerId}` : ''}`),
};

export default {
  authAPI,
  roomAPI,
  matchAPI,
  matchmakingAPI,
  problemAPI,
  leaderboardAPI,
  playerAPI,
  compilerAPI,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
};

