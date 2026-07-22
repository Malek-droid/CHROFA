'use strict';

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const dotenv = require('dotenv');
dotenv.config();

// ─── Fail-fast env validation ─────────────────────────────────────────────────
// Enumerate every required variable. Missing any of these at boot means the
// server cannot function correctly, so we exit immediately with a clear message
// rather than letting the process limp along and produce confusing runtime errors.
const REQUIRED_ENV = ['MONGODB_URI', 'REDIS_URL', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[server] FATAL — missing required environment variable(s): ${missing.join(', ')}\n` +
    `Copy .env.example to .env and fill in the values before starting the server.`
  );
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const healthRouter = require('./routes/health');
const apiRouter = require('./routes/index');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { initializeEmailTransporter } = require('./services/emailService');
const { startReminderScheduler } = require('./services/reminderScheduler');
const { startDigestScheduler } = require('./services/digestScheduler');
const { backfillOnboardedStatus } = require('./scripts/backfillOnboarded');

// ─── CORS configuration ───────────────────────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list. Split and trim to produce the
// whitelist array passed to the cors() middleware.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
  },
  credentials: true,
};

// ─── App initialisation ───────────────────────────────────────────────────────
const app = express();

const passport = require('./config/passport');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

// NoSQL injection protection - sanitizes user input to prevent MongoDB operator injection
app.use(mongoSanitize());

// Rate limiting for all API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limiting for auth endpoints (relaxed for development)
// Production: 20 attempts / 15 min — guards against brute force while allowing
// legitimate use (password typos, multi-tab sessions, etc.).
// Development: 100 attempts / 15 min so local testing is never blocked.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // 20 in production, 100 in development
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(passport.initialize());

// Morgan logs only in development so production logs aren't noisy.
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api', apiRouter);

// ─── Error-handling middleware ────────────────────────────────────────────────
// notFound must come AFTER all real routes so it only catches unmatched ones.
// errorHandler must be last — Express identifies it as an error handler via arity (4 args).
app.use(notFound);
app.use(errorHandler);

// ─── Boot sequence ────────────────────────────────────────────────────────────
// We connect to MongoDB before starting the HTTP server so:
//   (a) Mongoose index builds are complete before any traffic is served, and
//   (b) the unique indexes on User.email / Customer.email are enforced from the
//       first request — no window where concurrent inserts can bypass them.
const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  try {
    await connectDB();
    // Backfill isOnboarded flag for businesses created before the field existed.
    // Runs once at startup; idempotent — safe to run every boot.
    await backfillOnboardedStatus();
    await connectRedis();

    // Initialize email service
    initializeEmailTransporter();

    // Start reminder scheduler (runs every hour)
    startReminderScheduler();

    // Start weekly digest scheduler (runs every Monday at 8:00 AM UTC)
    startDigestScheduler();

    // Start BullMQ calendar sync worker
    const { initWorker } = require('./workers/calendarSyncWorker');
    initWorker();

    const server = app.listen(PORT, () => {
      console.log(
        `[server] Cadence API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
      );

      // Pre-warm Ollama model to avoid cold-start timeout on first user request
      const warmStart = Date.now();
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1';
      console.log('[AI Pre-warm] Sending warm-up request to Ollama...');
      fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
        signal: AbortSignal.timeout(120_000),
      })
        .then(() => {
          console.log(`[AI Pre-warm] Model warm — ready in ${((Date.now() - warmStart) / 1000).toFixed(1)}s`);
        })
        .catch((err) => {
          console.warn(`[AI Pre-warm] WARNING: Warm-up failed: ${err.message}. First user request may be slow.`);
        });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `[server] FATAL — port ${PORT} is already in use. ` +
          `Kill the existing process or set a different PORT in .env.`
        );
      } else {
        console.error('[server] HTTP server error:', err.message);
      }
      process.exit(1);
    });

    // ─── Graceful shutdown ──────────────────────────────────────────────────
    // On SIGTERM / SIGINT close the HTTP server first (stops new connections),
    // then disconnect Mongoose so in-flight DB operations can complete cleanly.
    const shutdown = (signal) => {
      console.log(`[server] ${signal} received — shutting down gracefully…`);
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        console.log('[server] MongoDB disconnected. Goodbye.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;
