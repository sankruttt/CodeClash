# CodeClash

CodeClash is a competitive, real-time head-to-head coding platform. Players queue up, get matched against an opponent, and race to solve the same coding problem first in the arena. It supports ranked matchmaking, private rooms/scrimmages, streaks, bounties, leaderboards, and match history — with code compiled and judged remotely via OnlineCompiler.io.

- **Frontend**: React 19 + Vite 8, deployed on Vercel
- **Backend**: Node.js + Express 4 + MongoDB (Mongoose), JWT auth, Zod validation, deployed serverless on Vercel

## Project Structure

```
training/
├── frontend/                 # React (Vite) single-page app
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx          # Entry point
│       ├── App.jsx           # Routes / app shell
│       ├── index.css         # Global styles
│       ├── responsive.css    # Responsive layout rules
│       ├── services/
│       │   └── api.js        # Fetch wrapper for the backend API
│       ├── config/
│       │   └── scoring.js    # Frontend scoring constants
│       ├── utils/
│       │   ├── tierUtils.js        # Tier/rank helpers
│       │   └── compilerHelpers.js  # Code/compiler helpers
│       ├── views/            # One component per screen
│       │   ├── LandingLoginView.jsx
│       │   ├── SignUpView.jsx
│       │   ├── DashboardView.jsx
│       │   ├── ArenaView.jsx
│       │   ├── LobbyView.jsx
│       │   ├── PrivateRoomView.jsx
│       │   ├── LeaderboardView.jsx
│       │   ├── HistoryView.jsx
│       │   └── ProfileView.jsx
│       ├── components/
│       │   ├── TopAppBar.jsx
│       │   ├── UnifiedDock.jsx
│       │   ├── StreakCard.jsx
│       │   ├── MatchCompleteModal.jsx
│       │   ├── MatchAbandonedModal.jsx
│       │   └── dashboard/    # Dashboard widgets
│       │       ├── WelcomeCard.jsx
│       │       ├── StatsGrid.jsx
│       │       ├── CombatBriefing.jsx
│       │       ├── VanguardLeaderboard.jsx
│       │       └── RecentDuelHistory.jsx
│       └── assets/           # Logos and images
│
├── server/                   # Express + MongoDB API (`codeclash-server`)
│   ├── index.js              # Bootstrap forwarder → src/index.js
│   └── src/
│       ├── index.js          # Express app bootstrap, middleware, routes
│       ├── config/           # database, languages, scoring, smtp, starterCodes
│       ├── models/           # Mongoose schemas (Match, Player, Room, Submission, …)
│       ├── routes/           # Express routers (auth, matches, rooms, problems, …)
│       ├── controllers/      # HTTP layer — parse, validate, call services, respond
│       ├── services/         # Business logic — auth, match, scoring, compiler, …
│       ├── validators/       # Zod schemas + validate() middleware
│       ├── middleware/       # auth.js, errorHandler.js, mailerGuard.js
│       ├── scripts/          # Seeder scripts and backend test suites
│       └── assets/           # Email logo attachment
│

└── README.md
