const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./src/app');
const { sequelize } = require('./src/models');
const scheduler = require('./src/services/scheduler');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    await sequelize.sync();
    console.log('Models synced.');

    // Start automation scheduler for all active projects
    await scheduler.startAll();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // ─── Graceful shutdown ────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
      scheduler.stopAll();
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        sequelize.close().then(() => {
          console.log('[Server] Database connections closed.');
          process.exit(0);
        });
      });
      // Force exit after 15s if something hangs
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
