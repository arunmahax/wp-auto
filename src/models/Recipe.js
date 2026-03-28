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
  // Source tracking
  source: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'manual',
    validate: {
      isIn: [['manual', 'sheet', 'competitor']],
    },
  },
  spy_source_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  spy_source_domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  // Source images from Google Sheet
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
  // Auto-retry tracking
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // Pipeline step tracking
  pipeline_step: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  // TTAPI Midjourney images (4 images from 1 prompt)
  mj_image1: { type: DataTypes.TEXT, allowNull: true },
  mj_image2: { type: DataTypes.TEXT, allowNull: true },
  mj_image3: { type: DataTypes.TEXT, allowNull: true },
  mj_image4: { type: DataTypes.TEXT, allowNull: true },
  // WordPress uploaded image URLs
  wp_image1: { type: DataTypes.TEXT, allowNull: true },
  wp_image2: { type: DataTypes.TEXT, allowNull: true },
  wp_featured_image: { type: DataTypes.TEXT, allowNull: true },
  wp_featured_media_id: { type: DataTypes.INTEGER, allowNull: true },
  // Content Writer article
  article_job_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  article_result: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // WordPress published article
  wp_post_id: { type: DataTypes.INTEGER, allowNull: true },
  published_url: { type: DataTypes.TEXT, allowNull: true },
  // Pinterest pin
  pin_image_url: { type: DataTypes.TEXT, allowNull: true },
  wp_pin_image: { type: DataTypes.TEXT, allowNull: true }, // Pin hosted on WordPress
  pinterest_title: { type: DataTypes.TEXT, allowNull: true },
  pinterest_description: { type: DataTypes.TEXT, allowNull: true },
  pinterest_board: { type: DataTypes.STRING(255), allowNull: true },
  // Legacy
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
