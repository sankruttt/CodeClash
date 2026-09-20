import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import {
  connectDatabase,
  isMongoConnected
} from './config/database.js';

import {
  errorHandler,
  notFoundHandler
} from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import submissionRoutes from './routes/submissions.js';
import problemRoutes from './routes/problems.js';
import leaderboardRoutes from './routes/leaderboard.js';
import matchmakingRoutes from './routes/matchmaking.js';
import roomRoutes from './routes/rooms.js';
import playerRoutes from './routes/players.js';
import bountyRoutes from './routes/bounty.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// CORS
// ============================================================

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    const allowedOrigins = [
      CLIENT_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'https://codeclash-nine.vercel.app'
    ];

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================================
// BODY PARSER
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
});

// ============================================================
// DATABASE INITIALIZATION & HEALTH GATE
// ============================================================

let databaseInitializationPromise = null;

export async function initializeDatabase() {
  if (databaseInitializationPromise) {
    return databaseInitializationPromise;
  }

  databaseInitializationPromise = (async () => {
    try {
      await connectDatabase();
      console.log('✅ Application connected to MongoDB (single source of truth)');
      return true;
    } catch (error) {
      console.error('❌ Database initialization error:', error.message);
      databaseInitializationPromise = null;
      throw error;
    }
  })();

  return databaseInitializationPromise;
}

// Database middleware: Ensure MongoDB is connected before serving database-dependent endpoints
app.use(async (req, res, next) => {
  // Allow health check endpoint even if DB is reconnecting
  if (req.path === '/api/health') {
    return next();
  }

  try {
    if (!isMongoConnected()) {
      await initializeDatabase();
    }
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE',
      message: 'MongoDB database is currently unavailable. Requests cannot be processed without MongoDB.'
    });
  }
});

// ============================================================
// ROOT ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.json({
    name: 'CodeClash API',
    version: '2.0.0',
    status: 'running',
    database: isMongoConnected() ? 'mongodb' : 'disconnected',

    endpoints: {
      auth: '/api/auth',
      matches: '/api/matches',
      submissions: '/api/submissions',
      problems: '/api/problems',
      leaderboard: '/api/leaderboard',
      matchmaking: '/api/matchmaking',
      rooms: '/api/rooms',
      players: '/api/players',
      bounty: '/api/bounty'
    }
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  const connected = isMongoConnected();
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    mongoUriConfigured: Boolean(process.env.MONGODB_URI),
    mongoConnected: connected,
    database: connected ? 'mongodb' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/bounty', bountyRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use(notFoundHandler);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// EXPORT FOR VERCEL
// ============================================================

export default app;

// ============================================================
// SERVER STARTUP (DETERMINISTIC)
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('  🚀 CodeClash API Server v2.0.0');
        console.log('═══════════════════════════════════════════');
        console.log(`  📡 Port: ${PORT}`);
        console.log(`  🔗 URL: http://localhost:${PORT}`);
        console.log(`  ❤️  Health: http://localhost:${PORT}/api/health`);
        console.log('  💾 Storage: MongoDB Atlas (Deterministic)');
        console.log('═══════════════════════════════════════════');
        console.log('');
      });
    })
    .catch((err) => {
      console.error('');
      console.error('❌ FATAL: Server failed to connect to MongoDB on startup:');
      console.error(`   ${err.message}`);
      console.error('❌ Server startup aborted. No in-memory database fallback is permitted.');
      console.error('');
      process.exit(1);
    });
}