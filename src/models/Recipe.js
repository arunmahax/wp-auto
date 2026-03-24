const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  image1: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  image2: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  featured_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'new',
    validate: {
      isIn: [['new', 'processing', 'completed', 'failed']],
    },
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  article_job_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  article_result: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  generated_image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'recipes',
});

module.exports = Recipe;
