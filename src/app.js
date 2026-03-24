const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Mount all routes under /api
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
