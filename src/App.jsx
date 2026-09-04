import { useEffect, useState } from 'react'
import './App.css'
import './responsive.css'
import logo from './assets/codeclash-logo.png'

// Navigation items for authenticated pages
const navItems = [
  { id: 'dashboard', label: 'Overview', icon: '⌂' },
  { id: 'lobby', label: 'Battle lobby', icon: '⚔' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '↗' },
  { id: 'history', label: 'Match history', icon: '◷' },
  { id: 'profile', label: 'My profile', icon: '👤' },
]

// Mock data for challenges
const challenges = [
  { id: 1, title: 'Binary Search', tag: 'Algorithms', difficulty: 'Medium', time: '12 min' },
  { id: 2, title: 'Valid Parentheses', tag: 'Data structures', difficulty: 'Easy', time: '08 min' },
  { id: 3, title: 'Merge Intervals', tag: 'Algorithms', difficulty: 'Hard', time: '20 min' },
]

// Mock leaderboard data
const leaderboard = [
  { rank: '01', name: 'Maya Chen', handle: '@mayacodes', rating: 2840, delta: 42, avatar: 'MC', color: 'coral', wins: 47, losses: 8 },
  { rank: '02', name: 'You', handle: '@asankrut', rating: 2710, delta: 68, avatar: 'SA', color: 'gold', wins: 38, losses: 15 },
  { rank: '03', name: 'Theo Brooks', handle: '@theob', rating: 2665, delta: 18, avatar: 'TB', color: 'blue', wins: 42, losses: 12 },
  { rank: '04', name: 'Nia Okafor', handle: '@nia.codes', rating: 2540, delta: 24, avatar: 'NO', color: 'green', wins: 35, losses: 18 },
  { rank: '05', name: 'Sarah Kim', handle: '@sarahkim', rating: 2480, delta: -15, avatar: 'SK', color: 'coral', wins: 31, losses: 21 },
  { rank: '06', name: 'James Liu', handle: '@jliu', rating: 2420, delta: 9, avatar: 'JL', color: 'blue', wins: 28, losses: 25 },
]

// Mock match data
const matches = [
  { id: 1, opponent: 'Maya Chen', avatar: 'MC', color: 'coral', result: 'Victory', score: '2 - 1', challenge: 'Graph Traversal', date: 'Today, 09:42', time: 18, rating: 25 },
  { id: 2, opponent: 'Theo Brooks', avatar: 'TB', color: 'blue', result: 'Victory', score: '2 - 0', challenge: 'LRU Cache', date: 'Yesterday, 18:07', time: 14, rating: 18 },
  { id: 3, opponent: 'Nia Okafor', avatar: 'NO', color: 'green', result: 'Defeat', score: '1 - 2', challenge: 'String Compression', date: 'Aug 24, 14:31', time: 22, rating: -12 },
]

// Battle questions
const battleQuestions = [
  {
    id: 1,
    title: 'Binary Search',
    difficulty: 'Medium',
    description: 'Given a sorted array of integers and a target value, return the index of the target if it exists. Otherwise, return -1.',
    constraints: [
      '1 ≤ nums.length ≤ 10,000',
      '-10,000 ≤ nums[i] ≤ 10,000',
      'All elements are unique',
      'nums is sorted in ascending order'
    ],
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4' },
      { input: 'nums = [5], target = 5', output: '0' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 13', output: '-1' }
    ],
    starterCode: `function search(nums, target) {
  // write your solution here
  return -1;
}`
  },
  {
    id: 2,
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: [
      '1 ≤ s.length ≤ 10,000',
      "s consists of parentheses only '()[]{}' "
    ],
    examples: [
      { input: 's = \"()\"', output: 'true' },
      { input: 's = \"()[]{}\"', output: 'true' },
      { input: 's = \"(]\"', output: 'false' }
    ],
    starterCode: `function isValid(s) {
  // write your solution here
  return false;
}`
  },
  {
    id: 3,
    title: 'Merge Intervals',
    difficulty: 'Hard',
    description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
    constraints: [
      '1 ≤ intervals.length ≤ 10,000',
      'intervals[i].length == 2',
      '0 ≤ starti ≤ endi ≤ 10,000'
    ],
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' }
    ],
    starterCode: `function merge(intervals) {
  // write your solution here
  return intervals;
}`
  }
]

// Opponent data for battles
const opponentData = {
  name: 'Bot',
  avatar: 'BT',
  color: 'blue',
  solved: [false, false, false],
  times: [0, 0, 0]
}

// Live duel data for lobby
const liveMatches = [
  { player1: 'Maya Chen', player1Pts: 640, player2: 'Jon Bell', player2Pts: 510, problem: 'Graph Traversal / Medium', timer: '08:42', status: 'in-progress' },
  { player1: 'Sarah Kim', player1Pts: 420, player2: 'James Liu', player2Pts: 380, problem: 'Binary Search / Easy', timer: '03:15', status: 'in-progress' },
  { player1: 'Alex Chen', player1Pts: 210, player2: 'Maria Santos', player2Pts: 280, problem: 'Two Sum / Medium', timer: '12:47', status: 'in-progress' },
]

// Random opponents for matchmaking
const opponents = [
  { name: 'Maya Chen', handle: '@mayacodes', avatar: 'MC', color: 'coral', rating: 2840 },
  { name: 'Theo Brooks', handle: '@theob', avatar: 'TB', color: 'blue', rating: 2665 },
  { name: 'Nia Okafor', handle: '@nia.codes', avatar: 'NO', color: 'green', rating: 2540 },
  { name: 'Sarah Kim', handle: '@sarahkim', avatar: 'SK', color: 'coral', rating: 2480 },
  { name: 'James Liu', handle: '@jliu', avatar: 'JL', color: 'blue', rating: 2420 },
]

// Current user profile
const currentUser = {
  name: 'Sankrut',
  handle: '@sankrut',
  avatar: 'SA',
  color: 'gold',
  rating: 2710,
  rank: 2,
  wins: 38,
  losses: 15,
  streak: 7,
  joinDate: '2025-01-15',
}

function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || 'login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [queueing, setQueueing] = useState(false)
  const [topbarPanel, setTopbarPanel] = useState(null)

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1) || 'login'
      setRoute(hash)
      if (hash !== 'login' && hash !== 'register') setIsAuthenticated(true)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (id) => { setTopbarPanel(null); window.location.hash = id }
  const logout = () => { setIsAuthenticated(false); navigate('login') }

  if (!isAuthenticated && (route === 'login' || route === 'register')) {
    return <LoginPage route={route} navigate={navigate} setIsAuthenticated={setIsAuthenticated} />
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={navItems} route={route} navigate={navigate} logout={logout} currentUser={currentUser} />
      <main className="main-content">
        <Topbar currentUser={currentUser} navigate={navigate} activePanel={topbarPanel} setActivePanel={setTopbarPanel} />
        {route === 'dashboard' && <Dashboard navigate={navigate} queueing={queueing} setQueueing={setQueueing} currentUser={currentUser} />}
        {route === 'lobby' && <Lobby navigate={navigate} queueing={queueing} setQueueing={setQueueing} currentUser={currentUser} />}
        {route === 'arena' && <Arena navigate={navigate} battleMode={true} currentUser={currentUser} />}
        {route === 'leaderboard' && <Leaderboard />}
        {route === 'history' && <History />}
        {route === 'profile' && <Profile navigate={navigate} currentUser={currentUser} />}
      </main>
    </div>
  )
}

function Avatar({ initials, color = 'coral', large = false }) { return <span className={`avatar ${color} ${large ? 'large' : ''}`}>{initials}</span> }

function Sidebar({ navItems, route, navigate, logout, currentUser }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="brand-compact" onClick={() => navigate('dashboard')}>
                <img src={logo} alt="CodeClash" className="brand-logo" />
                <span className="brand-text">CODECLASH</span>
              </button>
      </div>
      
      <nav className="nav-main">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${route === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.id === 'lobby' && <span className="live-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <Avatar initials={currentUser.avatar} color={currentUser.color} />
          <div className="user-info">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.rating.toLocaleString()} ⭐</small>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>
    </aside>
  )
}

function Topbar({ currentUser, navigate, activePanel, setActivePanel }) {
  const togglePanel = (panel) => setActivePanel(activePanel === panel ? null : panel)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="breadcrumb-text">Ranked Coding Arena</span>
      </div>
      <div className="topbar-right">
        <button className={`icon-btn ${activePanel === 'search' ? 'active' : ''}`} aria-label="Search" aria-expanded={activePanel === 'search'} onClick={() => togglePanel('search')}><span className="icon">⌕</span></button>
        <button className={`icon-btn notification ${activePanel === 'notifications' ? 'active' : ''}`} aria-label="Notifications" aria-expanded={activePanel === 'notifications'} onClick={() => togglePanel('notifications')}><span className="icon">♢</span><i /></button>
        <button className="user-btn" onClick={() => navigate('profile')}>
          <Avatar initials={currentUser.avatar} color={currentUser.color} />
          <span>{currentUser.name}</span>
        </button>
      </div>
      {activePanel === 'search' && (
        <div className="topbar-popover search-popover" role="search">
          <div className="search-header">
            <label htmlFor="global-search">Search</label>
            <button className="search-close" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <input id="global-search" autoFocus placeholder="Search challenges, players, or matches" />
          <button className="search-btn">Search</button>
        </div>
      )}
      {activePanel === 'notifications' && (
        <div className="topbar-popover notifications-popover" role="status">
          <span className="popover-label">NOTIFICATIONS</span>
          <strong>You’re all caught up</strong>
          <p>New match updates and ranking changes will appear here.</p>
        </div>
      )}
    </header>
  )
}

function LoginPage({ route, navigate, setIsAuthenticated }) {
  const [email, setEmail] = useState('alex@codeclash.dev')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignIn, setIsSignIn] = useState(true)

  const handleLogin = () => {
    if (email && password) {
      setIsAuthenticated(true)
      navigate('dashboard')
    }
  }

  const handleCreateAccount = () => {
    if (email && password && username && password === confirmPassword) {
      setIsAuthenticated(true)
      navigate('dashboard')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-header">
            <img src={logo} alt="CodeClash" className="auth-logo" />
            <span className="auth-brand-name">CODECLASH</span>
          </div>

          <div className="auth-tagline">
            <span className="tag-line-small">THE NEXT MATCH STARTS HERE</span>
            <h1>Think fast.<br /><span className="highlight">Climb higher.</span></h1>
            <p>A focused arena for developers who want the pressure of a live duel and the proof of a hard-earned rank.</p>
          </div>

          <div className="auth-features">
            <div className="feature">
              <span className="checkmark">✓</span>
              <span>Rated 1v1 duels</span>
            </div>
            <div className="feature">
              <span className="checkmark">✓</span>
              <span>Real-time judging</span>
            </div>
            <div className="feature">
              <span className="checkmark">✓</span>
              <span>No tutorial laps</span>
            </div>
          </div>

          <div className="auth-live-section">
            <span className="section-label">● LIVE ON THE GRID</span>
            <div className="online-count">1,248 online</div>
            <div className="duel-card">
              <div className="duel-status">
                <span className="status-badge">⚔ Duel in progress</span>
                <span className="timer">08:42</span>
              </div>
              <div className="duel-info">
                <div className="player">
                  <span className="avatar-small">MC</span>
                  <div className="player-name">Maya Chen</div>
                  <div className="player-pts">640 pts</div>
                </div>
                <div className="vs">VS</div>
                <div className="player">
                  <span className="avatar-small">JB</span>
                  <div className="player-name">Jon Bell</div>
                  <div className="player-pts">510 pts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <span className="welcome-badge">{isSignIn ? 'WELCOME BACK' : 'JOIN THE ARENA'}</span>
            <h2>{isSignIn ? 'Ready for your next duel?' : 'Create your account'}</h2>
            <p>{isSignIn ? 'Sign in to keep your streak alive and see who is waiting in the lobby.' : 'Start your coding journey and compete against developers worldwide.'}</p>
          </div>

          <div className="form-tabs">
            <button className={`tab ${isSignIn ? 'active' : ''}`} onClick={() => setIsSignIn(true)}>Sign in</button>
            <button className={`tab ${!isSignIn ? 'active' : ''}`} onClick={() => setIsSignIn(false)}>Create account</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); isSignIn ? handleLogin() : handleCreateAccount(); }} className="auth-form">
            {!isSignIn && (
              <div className="form-group">
                <label>USERNAME</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>PASSWORD</label>
              <div className="password-input-wrapper">
                <input
                  type="password"
                  placeholder="8 characters minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="toggle-pwd">👁</button>
              </div>
            </div>

            {!isSignIn && (
              <div className="form-group">
                <label>CONFIRM PASSWORD</label>
                <div className="password-input-wrapper">
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="toggle-pwd">👁</button>
                </div>
              </div>
            )}

            <div className="form-footer form-footer-single">
              {isSignIn && <button type="button" className="link-btn">Forgot password?</button>}
            </div>

            <button type="submit" className="btn-primary-large">
              {isSignIn ? 'Enter the arena' : 'Create account'}
              <span>↗</span>
            </button>
          </form>

          <div className="social-section">
            <span className="divider-text">OR CONTINUE WITH</span>
            <button className="btn-social">
              <span className="social-icon">🐙</span>
              GitHub
            </button>
          </div>

          <div className="auth-footer">
            <p>CodeClash never exposes your private repositories. Your profile only shows the problems you choose to submit.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ navigate, queueing, setQueueing, currentUser }) {
  const [foundOpponent, setFoundOpponent] = useState(null)

  const findRandomMatch = () => {
    setQueueing(true)
    setFoundOpponent(null)
    
    // Simulate finding a random opponent after 2 seconds
    setTimeout(() => {
      const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)]
      setFoundOpponent(randomOpponent)
      setQueueing(false)
    }, 2000)
  }

  const startMatch = () => {
    // Navigate to arena with battle mode
    window.location.hash = 'arena'
    setFoundOpponent(null)
  }

  return (
    <div className="page dashboard-page">
      <div className="page-hero">
        <div className="hero-content">
          <span className="eyebrow">Welcome back</span>
          <h1>Ready for a <span className="text-accent">rematch?</span></h1>
          <p>Your {currentUser.streak}-day streak is alive. Keep the momentum going.</p>
        </div>
        <button className="btn-primary" onClick={findRandomMatch}>
          {queueing ? 'Finding opponent...' : '⚔ Find a match'}
          <span>↗</span>
        </button>
      </div>

      {queueing && <QueueBanner setQueueing={setQueueing} />}
      
      {foundOpponent && (
        <div className="match-found-banner">
          <div className="match-found-content">
            <span className="match-found-label">OPPONENT FOUND</span>
            <div className="match-found-players">
              <div className="match-player">
                <span className="avatar">{currentUser.avatar}</span>
                <span className="player-name">{currentUser.name}</span>
                <span className="player-rating">{currentUser.rating}</span>
              </div>
              <span className="vs">VS</span>
              <div className="match-player">
                <span className={`avatar ${foundOpponent.color}`}>{foundOpponent.avatar}</span>
                <span className="player-name">{foundOpponent.name}</span>
                <span className="player-rating">{foundOpponent.rating}</span>
              </div>
            </div>
          </div>
          <div className="match-found-actions">
            <button className="btn-ghost" onClick={() => setFoundOpponent(null)}>Cancel</button>
            <button className="btn-primary" onClick={startMatch}>Accept & Fight</button>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{currentUser.wins}</div>
          <div className="stat-label">Matches won</div>
          <div className="stat-change">61% win rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentUser.rating.toLocaleString()}</div>
          <div className="stat-label">Current rating</div>
          <div className="stat-change text-green">↑ 68 pts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentUser.streak}</div>
          <div className="stat-label">Day streak</div>
          <div className="stat-change text-green">Personal best</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">#{currentUser.rank}</div>
          <div className="stat-label">Global rank</div>
          <div className="stat-change">Top 1%</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel section-panel">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">KEEP CLIMBING</span>
              <h2>Recommended challenges</h2>
            </div>
            <button className="btn-text" onClick={() => navigate('arena')}>View all →</button>
          </div>
          <div className="challenges-list">
            {challenges.map((challenge, i) => (
              <button key={challenge.id} className="challenge-item" onClick={() => navigate('arena')}>
                <span className="challenge-number">0{i + 1}</span>
                <div className="challenge-meta">
                  <div className="challenge-title">{challenge.title}</div>
                  <div className="challenge-tag">{challenge.tag}</div>
                </div>
                <span className={`difficulty-badge ${challenge.difficulty.toLowerCase()}`}>{challenge.difficulty}</span>
                <span className="time-estimate">{challenge.time}</span>
                <span className="arrow">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel section-panel">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">YOUR ACTIVITY</span>
              <h2>Win streak</h2>
            </div>
          </div>
          <div className="streak-display">
            <div className="streak-number">{currentUser.streak}<small>days</small></div>
            <div className="streak-info">Best this month: {currentUser.streak} days</div>
          </div>
          <div className="week-chart">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="day-bar">
                <div className="bar" style={{height: `${Math.random() * 100}%`}}></div>
                <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel section-panel">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">RECENT BATTLES</span>
              <h2>Match history</h2>
            </div>
            <button className="btn-text" onClick={() => navigate('history')}>See all →</button>
          </div>
          <div className="matches-list">
            {matches.slice(0, 3).map((match) => (
              <div key={match.id} className={`match-item result-${match.result.toLowerCase()}`}>
                <Avatar initials={match.avatar} color={match.color} />
                <div className="match-details">
                  <div className="opponent-name">{match.opponent}</div>
                  <div className="match-meta">{match.challenge} • {match.date}</div>
                </div>
                <span className={`result-badge ${match.result.toLowerCase()}`}>{match.result}</span>
                <span className="score">{match.score}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel section-panel">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">GLOBAL RANK</span>
              <h2>Leaderboard</h2>
            </div>
            <button className="btn-text" onClick={() => navigate('leaderboard')}>Full board →</button>
          </div>
          <div className="leaderboard-list">
            {leaderboard.slice(0, 3).map((player) => (
              <div key={player.rank} className={`leaderboard-item ${player.name === 'You' ? 'highlight' : ''}`}>
                <span className="rank-badge">{player.rank}</span>
                <Avatar initials={player.avatar} color={player.color} />
                <div className="player-meta">
                  <div className="player-name">{player.name}</div>
                  <div className="player-handle">{player.handle}</div>
                </div>
                <div className="player-rating">{player.rating.toLocaleString()}</div>
                <span className={`rating-change ${player.delta > 0 ? 'text-green' : 'text-red'}`}>
                  {player.delta > 0 ? '+' : ''}{player.delta}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function QueueBanner({ setQueueing }) {
  return (
    <div className="queue-banner">
      <div className="spinner"></div>
      <div className="queue-text">
        <strong>Searching the arena</strong>
        <small>Matching you with a worthy opponent...</small>
      </div>
      <button onClick={() => setQueueing(false)}>Cancel</button>
    </div>
  )
}

function Lobby({ navigate, queueing, setQueueing, currentUser }) {
  const [activeDuel, setActiveDuel] = useState(0)
  const [foundOpponent, setFoundOpponent] = useState(null)

  const findRandomMatch = () => {
    setQueueing(true)
    setFoundOpponent(null)
    
    // Simulate finding a random opponent after 2 seconds
    setTimeout(() => {
      const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)]
      setFoundOpponent(randomOpponent)
      setQueueing(false)
    }, 2000)
  }

  const startMatch = () => {
    window.location.hash = 'arena'
    setFoundOpponent(null)
  }

  return (
    <div className="page lobby-page">
      <div className="lobby-header">
        <div>
          <span className="eyebrow">COMPETITIVE QUEUE</span>
          <h1>Battle <span className="text-accent">lobby</span></h1>
          <p>Choose how you want to compete, then enter the arena.</p>
        </div>
        <div className="online-indicator">
          <span className="dot">●</span>
          <span>{liveMatches.length} matches in progress</span>
        </div>
      </div>

      {queueing && (
        <div className="queue-banner">
          <div className="spinner"></div>
          <div className="queue-text">
            <strong>Searching the arena</strong>
            <small>Matching you with a worthy opponent...</small>
          </div>
          <button onClick={() => { setQueueing(false); setFoundOpponent(null); }}>Cancel</button>
        </div>
      )}

      {foundOpponent && (
        <div className="match-found-banner">
          <div className="match-found-content">
            <span className="match-found-label">OPPONENT FOUND</span>
            <div className="match-found-players">
              <div className="match-player">
                <span className="avatar">{currentUser.avatar}</span>
                <span className="player-name">{currentUser.name}</span>
                <span className="player-rating">{currentUser.rating}</span>
              </div>
              <span className="vs">VS</span>
              <div className="match-player">
                <span className={`avatar ${foundOpponent.color}`}>{foundOpponent.avatar}</span>
                <span className="player-name">{foundOpponent.name}</span>
                <span className="player-rating">{foundOpponent.rating}</span>
              </div>
            </div>
          </div>
          <div className="match-found-actions">
            <button className="btn-ghost" onClick={() => setFoundOpponent(null)}>Cancel</button>
            <button className="btn-primary" onClick={startMatch}>Accept & Fight</button>
          </div>
        </div>
      )}

      <div className="mode-cards-grid">
        <button className="mode-card featured" onClick={findRandomMatch}>
          <span className="mode-icon">⚔</span>
          <span className="mode-label">RECOMMENDED</span>
          <h3>Quick match</h3>
          <p>First to solve 2 of 3 challenges</p>
          <div className="mode-meta">{queueing ? 'Searching now' : '~2 min'} <span>↗</span></div>
        </button>
        
        <button className="mode-card" onClick={() => navigate('arena')}>
          <span className="mode-icon">◈</span>
          <span className="mode-label">PRACTICE</span>
          <h3>Solo sprint</h3>
          <p>Sharpen your skills against the clock</p>
          <div className="mode-meta">Start training <span>↗</span></div>
        </button>
        
        <button className="mode-card" onClick={() => navigate('arena')}>
          <span className="mode-icon">#</span>
          <span className="mode-label">CUSTOM</span>
          <h3>Private room</h3>
          <p>Challenge a friend with a room code</p>
          <div className="mode-meta">Create room <span>↗</span></div>
        </button>
      </div>

      <section className="panel live-duels-panel">
        <div className="duels-header">
          <span className="section-eyebrow">LIVE RIGHT NOW</span>
          <h2>Duels in progress</h2>
        </div>
        <div className="duel-tabs">
          {liveMatches.slice(0, 3).map((duel, i) => (
            <button
              key={i}
              className={`duel-tab ${activeDuel === i ? 'active' : ''}`}
              onClick={() => setActiveDuel(i)}
            >
              <span className="tab-number">{i + 1}</span>
              <span className="tab-players">{duel.player1.slice(0, 2).toUpperCase()} vs {duel.player2.slice(0, 2).toUpperCase()}</span>
            </button>
          ))}
        </div>
        <div className="duel-content">
          {liveMatches.slice(0, 3).map((duel, i) => (
            activeDuel === i && (
              <div key={i} className="duel-detail">
                <div className="duel-players">
                  <div className="player-info">
                    <span className="avatar-mini">{duel.player1.slice(0, 2).toUpperCase()}</span>
                    <span className="player-name">{duel.player1}</span>
                    <span className="pts">{duel.player1Pts} pts</span>
                  </div>
                  <span className="vs-badge">vs</span>
                  <div className="player-info">
                    <span className="pts">{duel.player2Pts} pts</span>
                    <span className="player-name">{duel.player2}</span>
                    <span className="avatar-mini">{duel.player2.slice(0, 2).toUpperCase()}</span>
                  </div>
                </div>
                <div className="duel-meta">
                  <span className="problem">{duel.problem}</span>
                  <span className="timer">⏱ {duel.timer}</span>
                </div>
              </div>
            )
          ))}
        </div>
      </section>
    </div>
  )
}

function Arena({ navigate, battleMode = false, currentUser, onBattleComplete }) {
  const [language, setLanguage] = useState('JavaScript')
  const [code, setCode] = useState(battleQuestions[0].starterCode)
  const [runState, setRunState] = useState('idle')
  const [activeTab, setActiveTab] = useState('problem')
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [solved, setSolved] = useState([false, false, false])
  const [questionTimes, setQuestionTimes] = useState([0, 0, 0])
  const [battleResult, setBattleResult] = useState(null)

  // Timer effect
  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning])

  // Start timer when arena is opened
  useEffect(() => {
    setTimer(0)
    setTimerRunning(true)
    return () => setTimerRunning(false)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const currentQuestion = battleQuestions[currentQuestionIndex]
  const testCases = currentQuestion.examples.map((ex, i) => ({
    input: ex.input,
    output: ex.output
  }))

  const simulateBotSolving = () => {
    // Simulate bot solving questions at random times (30-90 seconds per question)
    const botTimes = battleQuestions.map(() => Math.floor(Math.random() * 60) + 30)
    const botSolved = battleQuestions.map(() => Math.random() > 0.3) // 70% chance to solve
    return { times: botTimes, solved: botSolved }
  }

  const runCode = () => {
    const newSolved = [...solved]
    const newTimes = [...questionTimes]
    newSolved[currentQuestionIndex] = true
    newTimes[currentQuestionIndex] = timer
    setSolved(newSolved)
    setQuestionTimes(newTimes)
    setRunState('passed')
    setTimerRunning(false)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < 2) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setCode(battleQuestions[currentQuestionIndex + 1].starterCode)
      setTimer(0)
      setTimerRunning(true)
      setRunState('idle')
    } else {
      // All questions completed - determine winner
      const botData = simulateBotSolving()
      
      const playerScore = solved.filter(Boolean).length
      const botScore = botData.solved.filter(Boolean).length
      
      const playerTotalTime = questionTimes.reduce((a, b) => a + b, 0)
      const botTotalTime = botData.times.reduce((a, b) => a + b, 0)
      
      let winner = 'draw'
      let resultMessage = ''
      
      if (playerScore > botScore) {
        winner = 'player'
        resultMessage = 'Victory! You solved more problems!'
      } else if (botScore > playerScore) {
        winner = 'bot'
        resultMessage = 'Defeat! Your opponent solved more problems.'
      } else {
        // Same score - compare times
        if (playerTotalTime < botTotalTime) {
          winner = 'player'
          resultMessage = 'Victory! You were faster!'
        } else if (botTotalTime < playerTotalTime) {
          winner = 'bot'
          resultMessage = 'Defeat! Your opponent was faster.'
        } else {
          winner = 'draw'
          resultMessage = "It's a draw! Both equally matched."
        }
      }
      
      setBattleResult({
        winner,
        playerScore,
        botScore,
        playerTotalTime,
        botTotalTime,
        botTimes: botData.times,
        message: resultMessage
      })
    }
  }

  if (battleResult) {
    return (
      <div className="page arena-page">
        <div className="battle-result">
          <div className={`result-header ${battleResult.winner}`}>
            <h1>{battleResult.winner === 'player' ? '🎉 Victory!' : battleResult.winner === 'bot' ? '😔 Defeat' : "🤝 It's a Draw!"}</h1>
            <p>{battleResult.message}</p>
          </div>
          
          <div className="result-comparison">
            <div className="result-player">
              <span className="avatar gold">{currentUser?.avatar || 'SA'}</span>
              <h3>{currentUser?.name || 'You'}</h3>
              <div className="result-score">
                <span className="score">{battleResult.playerScore}/3 solved</span>
                <span className="time">Total: {formatTime(battleResult.playerTotalTime)}</span>
              </div>
              <div className="question-results">
                {battleQuestions.map((q, i) => (
                  <div key={i} className={`q-result ${solved[i] ? 'solved' : ''}`}>
                    <span>Q{i + 1}: {solved[i] ? `✓ ${formatTime(battleResult.playerTotalTime > 0 ? questionTimes[i] : 0)}` : '✗'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="result-vs">VS</div>
            
            <div className="result-player opponent">
              <span className="avatar blue">{opponentData.avatar}</span>
              <h3>{opponentData.name}</h3>
              <div className="result-score">
                <span className="score">{battleResult.botScore}/3 solved</span>
                <span className="time">Total: {formatTime(battleResult.botTotalTime)}</span>
              </div>
              <div className="question-results">
                {battleQuestions.map((q, i) => (
                  <div key={i} className={`q-result ${battleResult.botTimes ? (Math.random() > 0.3 ? 'solved' : '') : ''}`}>
                    <span>Q{i + 1}: {battleResult.botTimes ? (Math.random() > 0.3 ? `✓ ${formatTime(battleResult.botTimes[i])}` : '✗') : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="result-actions">
            <button className="btn-ghost" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
            <button className="btn-primary" onClick={() => {
              setBattleResult(null)
              setSolved([false, false, false])
              setQuestionTimes([0, 0, 0])
              setCurrentQuestionIndex(0)
              setCode(battleQuestions[0].starterCode)
              setTimer(0)
              setTimerRunning(true)
              setRunState('idle')
            }}>Rematch</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page arena-page">
      <div className="arena-header">
        <div>
          {battleMode && (
            <div className="battle-progress">
              {battleQuestions.map((q, i) => (
                <span key={i} className={`progress-dot ${i === currentQuestionIndex ? 'active' : ''} ${solved[i] ? 'solved' : ''}`}>{i + 1}</span>
              ))}
            </div>
          )}
          <span className="eyebrow">{battleMode ? 'BATTLE MODE' : 'SOLO SPRINT • PRACTICE'}</span>
          <h1>{currentQuestion.title}</h1>
          <p>Question {currentQuestionIndex + 1} of 3</p>
        </div>
        <div className="arena-header-right">
          <span className="timer">{formatTime(timer)}</span>
          <button className="btn-ghost" onClick={() => navigate('dashboard')}>← Exit arena</button>
        </div>
      </div>

      <div className="arena-workspace">
        <section className="problem-section">
          <div className="problem-header">
            <button className={`tab ${activeTab === 'problem' ? 'active' : ''}`} onClick={() => setActiveTab('problem')}>Problem</button>
            <button className={`tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>Submissions</button>
            {solved[currentQuestionIndex] && <span className="solved-badge">✓ Solved in {formatTime(questionTimes[currentQuestionIndex])}</span>}
          </div>

          {activeTab === 'problem' && (
          <div className="problem-content">
            <span className={`difficulty-badge ${currentQuestion.difficulty.toLowerCase()}`}>{currentQuestion.difficulty}</span>
            <h2>{currentQuestion.title}</h2>
            <p>{currentQuestion.description}</p>
            
            <h3>Constraints</h3>
            <ul>
              {currentQuestion.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>

            <h3>Examples</h3>
            <pre>{currentQuestion.examples.map(e => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n')}</pre>
          </div>
          )}
          {activeTab === 'submissions' && (
            <div className="problem-content">
              <h2>Your Submissions</h2>
              <p>No submissions yet. Run your code to see it here.</p>
            </div>
          )}
        </section>

        <section className="code-section">
          <div className="editor-header">
            <div className="file-info">
              <span className="file-icon">📄</span>
              <span className="file-name">solution.{language === 'JavaScript' ? 'js' : language === 'Python' ? 'py' : language === 'TypeScript' ? 'ts' : 'java'}</span>
            </div>
            <select className="lang-select" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Programming language">
              {['JavaScript', 'Python', 'TypeScript', 'Java'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>

          <div className="code-editor">
            <div className="line-numbers">
              {[...Array(code.split('\n').length)].map((_, i) => (
                <span key={i}>{String(i + 1).padStart(2, '0')}</span>
              ))}
            </div>
            <textarea
              className="code-input"
              value={code}
              onChange={(event) => { setCode(event.target.value); if (solved[currentQuestionIndex]) setRunState('passed') }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  runCode()
                }
              }}
              spellCheck="false"
              aria-label={`${language} solution editor`}
            />
          </div>

          <div className="test-cases">
            <div className="tests-header">Test Cases</div>
            {testCases.map((tc, i) => (
              <div key={i} className={`test-item ${runState === 'passed' ? 'pass' : 'pending'}`}>
                <span className="status-dot">●</span>
                <code className="test-input">{tc.input.slice(0, 50)} → {tc.output}</code>
                <span className={`test-status ${runState === 'passed' ? 'pass' : 'pending'}`}>{runState === 'passed' ? 'PASS' : 'READY'}</span>
              </div>
            ))}
          </div>

          <div className="editor-footer">
            <span className="hint">⌘ Enter to run</span>
            <div className="editor-actions">
              {runState === 'passed' && (
                <button className="btn-ghost" onClick={nextQuestion}>
                  {currentQuestionIndex < 2 ? 'Next Question →' : 'See Results'}
                </button>
              )}
              <button className="btn-primary" onClick={runCode}>
                {solved[currentQuestionIndex] ? 'Run again' : 'Run solution'}
                <span>↗</span>
              </button>
            </div>
          </div>
          {runState === 'passed' && solved[currentQuestionIndex] && (
            <div className="arena-result" role="status">
              <span>✓</span>
              <div><strong>Problem solved in {formatTime(questionTimes[currentQuestionIndex])}</strong><small>{currentQuestionIndex < 2 ? 'Move to next question' : 'Battle complete'}</small></div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
function Leaderboard() {
  const fullLeaderboard = [
    ...leaderboard,
    ...leaderboard.slice(0, 2).map((p, i) => ({
      ...p,
      rank: String(leaderboard.length + i + 1).padStart(2, '0'),
      delta: Math.floor(Math.random() * 100) - 50,
    })),
  ]

  return (
    <div className="page leaderboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">SEASON 04 • GLOBAL</span>
          <h1>The <span className="text-accent">leaderboard</span></h1>
          <p>Top competitors across every arena.</p>
        </div>
        <div className="header-controls">
          <button className="btn-filter">This week ⌄</button>
          <button className="btn-filter">Global ⌄</button>
        </div>
      </div>

      <section className="panel leaderboard-table-panel">
        <div className="table-header">
          <span>Rank</span>
          <span>Player</span>
          <span>Rating</span>
          <span>Change</span>
        </div>
        {fullLeaderboard.map((player) => (
          <div key={`${player.rank}-${player.name}`} className={`table-row ${player.name === 'You' ? 'highlight' : ''}`}>
            <span className="rank-col">{player.rank}</span>
            <div className="player-col">
              <Avatar initials={player.avatar} color={player.color} />
              <div className="player-info">
                <div className="name">{player.name}</div>
                <div className="handle">{player.handle}</div>
              </div>
            </div>
            <span className="rating-col">{player.rating.toLocaleString()}</span>
            <span className={`change-col ${player.delta > 0 ? 'positive' : 'negative'}`}>
              {player.delta > 0 ? '+' : ''}{player.delta}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
function History() {
  const historyMatches = [
    ...matches,
    ...matches.slice(0, 3),
  ].map((m, i) => ({
    ...m,
    id: i,
    challenge: ['Binary Search', 'Valid Parentheses', 'Merge Intervals', 'LRU Cache', 'Two Sum', 'Reverse String'][i % 6],
  }))

  return (
    <div className="page history-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">YOUR RECORD</span>
          <h1>Match <span className="text-accent">history</span></h1>
          <p>A record of every battle fought in the arena.</p>
        </div>
        <button className="btn-filter">All time ⌄</button>
      </div>

      <section className="panel history-table-panel">
        <div className="history-head">
          <span>Date</span>
          <span>Opponent</span>
          <span>Problem</span>
          <span>Result</span>
          <span>Rating</span>
        </div>
        {historyMatches.map((match) => (
          <div key={match.id} className="history-row">
            <span className="date-col">{match.date}</span>
            <div className="opponent-col">
              <Avatar initials={match.avatar} color={match.color} />
              <div className="opponent-name">{match.opponent}</div>
            </div>
            <span className="problem-col">{match.challenge}</span>
            <span className={`result-col ${match.result.toLowerCase()}`}>{match.result}</span>
            <span className={`rating-col ${match.rating > 0 ? 'positive' : 'negative'}`}>
              {match.rating > 0 ? '+' : ''}{Math.abs(match.rating)}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
function Profile({ navigate, currentUser }) {
  return (
    <div className="page profile-page">
      <div className="profile-hero">
        <Avatar initials={currentUser.avatar} color={currentUser.color} large />
        <div className="profile-info">
          <span className="eyebrow">PLAYER PROFILE</span>
          <h1>{currentUser.name}</h1>
          <p>{currentUser.handle} • Member since 2025</p>
        </div>
        <button className="btn-ghost" onClick={() => navigate('dashboard')}>← Back to dashboard</button>
      </div>

      <div className="profile-stats">
        <div className="stat-box">
          <div className="stat-val">{currentUser.rating}</div>
          <div className="stat-lbl">Rating</div>
          <div className="stat-chg">Top 1%</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{currentUser.wins}</div>
          <div className="stat-lbl">Matches won</div>
          <div className="stat-chg">{Math.round(currentUser.wins / (currentUser.wins + currentUser.losses) * 100)}% win rate</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{currentUser.streak}</div>
          <div className="stat-lbl">Best streak</div>
          <div className="stat-chg">This season</div>
        </div>
      </div>

      <section className="panel profile-panel">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">PLAYER STATS</span>
            <h2>Performance breakdown</h2>
          </div>
        </div>
        <div className="stats-breakdown">
          <div className="stat-row">
            <span>Algorithms</span>
            <div className="progress-bar">
              <div className="progress" style={{width: '84%'}}></div>
            </div>
            <span className="percent">84%</span>
          </div>
          <div className="stat-row">
            <span>Data structures</span>
            <div className="progress-bar">
              <div className="progress" style={{width: '72%'}}></div>
            </div>
            <span className="percent">72%</span>
          </div>
          <div className="stat-row">
            <span>Problem solving</span>
            <div className="progress-bar">
              <div className="progress" style={{width: '91%'}}></div>
            </div>
            <span className="percent">91%</span>
          </div>
        </div>
      </section>
    </div>
  )
}


export default App
