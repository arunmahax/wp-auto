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
  google_sheet_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  trigger_interval: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'disabled',
    validate: {
      isIn: [['3h', '5h', '6h', '8h', '12h', 'disabled']],
    },
  },
  trigger_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  wp_categories: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  wp_pinboards: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content_categories: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content_authors: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_trigger_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
