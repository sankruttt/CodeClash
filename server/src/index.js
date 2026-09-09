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

import { inMemoryStore } from './services/inMemoryStore.js';

// Routes
import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import submissionRoutes from './routes/submissions.js';
import problemRoutes from './routes/problems.js';
import leaderboardRoutes from './routes/leaderboard.js';
import matchmakingRoutes from './routes/matchmaking.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

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
// DATABASE INITIALIZATION
// ============================================================

let databaseInitializationPromise = null;

async function initializeDatabase() {
  // If initialization is already happening, wait for it
  if (databaseInitializationPromise) {
    return databaseInitializationPromise;
  }

  databaseInitializationPromise = (async () => {
    try {
      const connected = await connectDatabase();

      if (connected && isMongoConnected()) {
        console.log('✅ Application using MongoDB');
        return true;
      }

      console.log('⚠️ MongoDB unavailable');
      console.log('💾 Application using in-memory storage');

      await inMemoryStore.seedDefaultUsers();

      return false;
    } catch (error) {
      console.error(
        '❌ Database initialization error:',
        error.message
      );

      try {
        await inMemoryStore.seedDefaultUsers();
        console.log('💾 Application using in-memory storage');
      } catch (seedError) {
        console.error(
          '❌ In-memory seed error:',
          seedError.message
        );
      }

      return false;
    }
  })();

  return databaseInitializationPromise;
}

// ============================================================
// DATABASE MIDDLEWARE
// ============================================================

// Make sure database initialization finishes before requests
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
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
    database: isMongoConnected() ? 'mongodb' : 'in-memory',

    endpoints: {
      auth: '/api/auth',
      matches: '/api/matches',
      submissions: '/api/submissions',
      problems: '/api/problems',
      leaderboard: '/api/leaderboard',
      matchmaking: '/api/matchmaking'
    }
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',

    mongoUriConfigured: Boolean(
      process.env.MONGODB_URI
    ),

    mongoConnected: isMongoConnected(),

    database: isMongoConnected()
      ? 'mongodb'
      : 'in-memory',

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
// LOCAL DEVELOPMENT ONLY
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  initializeDatabase().catch(err => {
    console.error('❌ Fatal: Database initialization failed:', err.message);
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🚀 CodeClash API Server v2.0.0');
    console.log('═══════════════════════════════════════════');
    console.log(`  📡 Port: ${PORT}`);
    console.log(`  🔗 URL: http://localhost:${PORT}`);
    console.log(
      `  ❤️  Health: http://localhost:${PORT}/api/health`
    );
    console.log('═══════════════════════════════════════════');
    console.log('');
  });
}