const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserSettings = sequelize.define('UserSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  ttapi_api_key: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content_api_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  content_api_key: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pin_generator_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  pin_generator_key: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  openai_api_key: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'user_settings',
});

module.exports = UserSettings;
