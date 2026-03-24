const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Placeholder — fully implemented in Phase 4 (US2)
const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  wp_api_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  wp_username: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  wp_app_password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
