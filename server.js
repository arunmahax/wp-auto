require('dotenv').config();

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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
