/**
 * Ethio Matric Academy — Express Server
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');
const logger = require('./utils/logger');
const { startExpiryJob } = require('./services/subscriptionExpiry');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const questionRoutes = require('./routes/questionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const importRoutes = require('./routes/importRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ───────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be served
}));

// ─── CORS ────────────────────────────────────
// CLIENT_URL may be a comma-separated list of allowed origins for multi-domain
// deployments (e.g. "https://ethiomatric.com,https://www.ethiomatric.com").
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-server calls)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

// Apply global limiter but skip SSE endpoints (they need long-lived connections)
app.use('/api', (req, res, next) => {
  if (req.path.includes('/import/bulk/progress/')) {
    return next(); // Skip rate limiting for SSE streams
  }
  globalLimiter(req, res, next);
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ─── Body Parsers ────────────────────────────
// Compression is applied globally EXCEPT for SSE (text/event-stream) responses.
// Gzip buffers the response body before writing; SSE frames must flush immediately
// or the client sees silence and its onerror fires as "connection lost".
app.use(compression({
  filter: (req, res) => {
    // Never compress SSE streams
    const accept = req.headers.accept || '';
    if (accept.includes('text/event-stream')) return false;
    // Never compress the bulk-progress route regardless of Accept header
    if (req.path && req.path.includes('/import/bulk/progress/')) return false;
    return compression.filter(req, res);
  },
}));

// Capture raw body for Chapa webhook HMAC verification BEFORE express.json() processes it.
// This must come first so the raw bytes are available in req.rawBody on the webhook route.
app.use(
  '/api/payments/chapa/callback',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Expose rawBody as a Buffer for HMAC verification in the controller
    req.rawBody = req.body;
    // Re-parse as JSON so the controller can read req.body normally
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  }
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(sanitize); // ← sanitize all inputs

// ─── Logging ─────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Static Files (uploads) ──────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes ──────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/import', importRoutes);

// ─── Health Check ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── 404 Handler ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────
const start = async () => {
  await testConnection();

  // ── Payment configuration checks (Priority 8) ──────────
  // Warn loudly in any environment; hard-fail in production.
  const paymentWarnings = [];
  if (!process.env.CHAPA_SECRET_KEY) {
    paymentWarnings.push('CHAPA_SECRET_KEY is not set — Chapa payments will fail');
  }
  if (!process.env.CHAPA_WEBHOOK_SECRET) {
    paymentWarnings.push('CHAPA_WEBHOOK_SECRET is not set — webhook signature verification is disabled');
  }
  if (process.env.NODE_ENV === 'production') {
    if ((process.env.CHAPA_CALLBACK_URL || '').includes('localhost')) {
      paymentWarnings.push('CHAPA_CALLBACK_URL contains "localhost" in production — Chapa cannot reach it');
    }
    if ((process.env.CHAPA_RETURN_URL || '').includes('localhost')) {
      paymentWarnings.push('CHAPA_RETURN_URL contains "localhost" in production — students will not be redirected correctly');
    }
  }

  if (paymentWarnings.length > 0) {
    paymentWarnings.forEach(w => logger.warn(`[Config] ⚠️  ${w}`));
    if (process.env.NODE_ENV === 'production' && !process.env.CHAPA_SECRET_KEY) {
      logger.error('[Config] ❌  CHAPA_SECRET_KEY is required in production. Exiting.');
      process.exit(1);
    }
  } else {
    logger.info('[Config] ✅  Payment configuration OK');
  }

  // Start subscription expiry job after DB is confirmed ready.
  startExpiryJob();

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();

module.exports = app;
