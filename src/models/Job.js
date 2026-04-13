const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
      isIn: [['pending', 'running', 'completed', 'failed', 'cancelled']],
    },
  },
  recipe_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  pipeline_step: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  result_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'jobs',
});

module.exports = Job;
