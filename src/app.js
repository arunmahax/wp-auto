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

// CORS — in production the SPA is served by Express itself, so allow same-origin.
// Also support explicit CORS_ORIGIN for any additional origins.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (curl, server-to-server, etc.)
    if (!origin) return cb(null, true);
    // Explicit allowlist match
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Dev mode: allow localhost Vite dev server
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) return cb(null, true);
    // Production with self-served SPA: if no CORS_ORIGIN configured, allow all
    // (the SPA and API share the same origin, browser still sends Origin on XHR)
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body size limit — prevent memory exhaustion
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
