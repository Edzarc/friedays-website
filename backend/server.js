import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import oauthRoutes from './routes/oauth.js';
import { initializeDatabase } from './db/init.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// Middleware
// ============================================================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================================
// Routes
// ============================================================================

app.use('/auth', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use(notFound);
app.use(errorHandler);

// ============================================================================
// Database & Server Start
// ============================================================================

async function startServer() {
  try {
    // Initialize database
    console.log('🗄️  Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🍗 FRIEDAYS AUTH SERVER RUNNING 🍗  ║
╠════════════════════════════════════════╣
║                                        ║
║  Server: http://localhost:${PORT}           ║
║  Environment: ${process.env.NODE_ENV || 'development'}          ║
║                                        ║
║  API Routes:                           ║
║  • POST /auth/register                 ║
║  • POST /auth/login                    ║
║  • POST /auth/forgot-password          ║
║  • POST /auth/reset-password           ║
║  • GET  /auth/verify-email             ║
║  • GET  /auth/google                   ║
║  • GET  /auth/google/callback          ║║  • GET  /auth/facebook                 ║
║  • GET  /auth/facebook/callback        ║║  • GET  /health                        ║
║                                        ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});
