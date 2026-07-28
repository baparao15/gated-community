require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const visitorRoutes = require('./routes/visitor.routes');
const complaintRoutes = require('./routes/complaint.routes');
const announcementRoutes = require('./routes/announcement.routes');
const paymentRoutes = require('./routes/payment.routes');
const facilityRoutes = require('./routes/facility.routes');
const securityRoutes = require('./routes/security.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const voiceRoutes = require('./routes/voice.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const businessRoutes = require('./routes/business.routes');

const app = express();

// ── Security ───────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(mongoSanitize());
app.use(hpp());

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Only enforced in production. Local development/demos shouldn't get locked out
// by a handful of page reloads or login retries.
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);

  // Brute-force-sensitive auth endpoints get a stricter limiter.
  // Scoped to just these routes (not the whole /auth prefix) so that
  // frequent, legitimate calls like /auth/me or /auth/logout from an
  // already-authenticated session don't get rate-limited during normal use.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth attempts, please try again later' },
  });
  app.use(
    ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'],
    authLimiter
  );
}

// ── Body parsing & compression ─────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ── Static files (uploads) ─────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ success: true, message: 'Server is healthy', timestamp: new Date() }));

// ── API Routes ─────────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(API, userRoutes);
app.use(`${API}/visitors`, visitorRoutes);
app.use(`${API}/complaints`, complaintRoutes);
app.use(API, announcementRoutes);
app.use(API, paymentRoutes);
app.use(API, facilityRoutes);
app.use(API, securityRoutes);
app.use(API, dashboardRoutes);
app.use(API, voiceRoutes);
app.use(`${API}/marketplace`, marketplaceRoutes);
app.use(`${API}/business`, businessRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
