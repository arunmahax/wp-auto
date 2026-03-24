const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Placeholder — fully implemented in Phase 5 (US3)
const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'running', 'completed', 'failed']],
    },
  },
}, {
  tableName: 'jobs',
});

module.exports = Job;
