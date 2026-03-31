const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust first proxy (Traefik/Coolify) so rate limiter sees real IPs
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — allow same-origin requests in production (SPA served by Express).
// Use CORS_ORIGIN env var to restrict to specific origins if needed.
app.use(cors({
  origin: true,
  credentials: true,
}));

// Body size limit — prevent memory exhaustion
app.use('/api/templates/clone-from-image', express.json({ limit: '15mb' }));
app.use(express.json({ limit: '2mb' }));

// Global API rate limit — 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Strict rate limit for auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
});

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Mount all routes under /api
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── Serve frontend in production ──────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for any non-API route
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
