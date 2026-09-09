const API_BASE = 'http://localhost:3001/api';

// Helper for fetch with error handling
async function apiRequest(endpoint, options = {}) {
  console.log(`API Request: ${options.method || 'GET'} ${endpoint}`);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });
    
    const data = await response.json();
    console.log(`API Response: ${endpoint}`, data);
    
    if (!response.ok) {
      throw new Error(data.error || `API request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Room APIs
export const roomAPI = {
  createRoom: (hostId, hostName) =>
    apiRequest('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ hostId, hostName }),
    }),

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

  startBattle: (code) =>
    apiRequest(`/rooms/${code}/start`, {
      method: 'POST',
    }),
};

// Match APIs
export const matchAPI = {
  createMatch: (roomCode, player1, player2, questions) =>
    apiRequest('/matches/create', {
      method: 'POST',
      body: JSON.stringify({ roomCode, player1, player2, questions }),
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

  getMatch: (id) =>
    apiRequest(`/matches/${id}`),
};

// Player APIs
export const playerAPI = {
  register: (id, name, rating = 1500) =>
    apiRequest('/players/register', {
      method: 'POST',
      body: JSON.stringify({ id, name, rating }),
    }),

  getPlayer: (id) =>
    apiRequest(`/players/${id}`),
};

export default { roomAPI, matchAPI, playerAPI };
