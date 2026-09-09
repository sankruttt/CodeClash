import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, isMongoConnected } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
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

// CORS - allow all origins in development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============== ROUTES ==============

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isMongoConnected() ? 'mongodb' : 'in-memory',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/matchmaking', matchmakingRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============== START SERVER ==============

async function start() {
  // Try to connect to MongoDB (non-blocking)
  await connectDatabase();

  if (!isMongoConnected()) {
    await inMemoryStore.seedDefaultUsers();
    console.log('💾 Seeded in-memory demo users (alice@codeclash.com / Alice123)');
  }
  
  app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════════');
    console.log('  🚀 CodeClash API Server v2.0.0');
    console.log('═══════════════════════════════════════════');
    console.log(`  📡 Port: ${PORT}`);
    console.log(`  💾 Database: ${isMongoConnected() ? '✅ MongoDB' : '⚠️  In-Memory (fallback)'}`);
    console.log(`  🔗 URL: http://localhost:${PORT}`);
    console.log(`  ❤️  Health: http://localhost:${PORT}/api/health`);
    console.log('═══════════════════════════════════════════\n');
  });
}

start();
