const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Pinterest Pin Template Model
 * Stores reusable pin design templates
 */
const Template = sequelize.define('Template', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Layout type: two-photo-stack, text-bar, badge-style, full-background
  layout: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'text-bar',
  },
  // Pin dimensions (Pinterest optimal: 1000x1500)
  width: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1500,
  },
  // Background settings
  background_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'images', // 'images', 'solid', 'gradient'
  },
  background_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ffffff',
  },
  background_gradient: {
    type: DataTypes.TEXT,
    allowNull: true, // JSON: { "type": "linear", "angle": 180, "colors": ["#fff", "#000"] }
  },
  // Text Bar Settings (for text-bar layout)
  text_bar_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  text_bar_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ffffff',
  },
  text_bar_opacity: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.0,
  },
  text_bar_position: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'center', // 'top', 'center', 'bottom'
  },
  text_bar_height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 200,
  },
  text_bar_stroke_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  text_bar_stroke_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#000000',
  },
  text_bar_stroke_width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2,
  },
  text_bar_stroke_opacity: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.0,
  },
  // Image settings
  image_position: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'cover', // 'cover', 'contain', 'top', 'center', 'bottom'
  },
  image_opacity: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.0,
  },
  // Top/Bottom image sizing (for two-photo-stack layout)
  top_image_height: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 50, // percentage of canvas
  },
  bottom_image_height: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 50, // percentage of canvas
  },
  image_gap: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0, // gap between images in pixels
  },
  // Title text settings
  title_font: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Montserrat',
  },
  title_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 72,
  },
  title_weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 700,
  },
  title_color: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '#000000',
  },
  title_alignment: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'center',
  },
  title_line_height: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.2,
  },
  title_max_width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 90, // percentage
  },
  title_outline_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  title_outline_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ffffff',
  },
  title_outline_width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
  },
  title_shadow_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  title_shadow_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'rgba(0,0,0,0.5)',
  },
  title_shadow_blur: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 4,
  },
  title_max_lines: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  // Pre-title settings (text above the main title)
  pretitle_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  pretitle_text: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'THE BEST',
  },
  pretitle_font: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Montserrat',
  },
  pretitle_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 28,
  },
  pretitle_weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 400,
  },
  pretitle_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#666666',
  },
  // Subtitle settings
  subtitle_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  subtitle_font: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Montserrat',
  },
  subtitle_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 32,
  },
  subtitle_weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 400,
  },
  subtitle_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#666666',
  },
  subtitle_text: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'EASY | DELICIOUS | THE BEST',
  },
  // Website/branding
  website_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  website_text: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'yoursite.com',
  },
  website_font: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Montserrat-Regular',
  },
  website_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 36,
  },
  website_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#000000',
  },
  website_position: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'bottom', // 'top', 'bottom'
  },
  website_background: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // Badge settings (for badge-style layout)
  badge_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  badge_text: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'RECIPE',
  },
  badge_position: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'top-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  },
  badge_background: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#e63946',
  },
  badge_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ffffff',
  },
  badge_font: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Montserrat',
  },
  badge_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 24,
  },
  // Decorative elements
  decorations_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  decorations_config: {
    type: DataTypes.TEXT,
    allowNull: true, // JSON array of decorations
  },
  // Image overlay/filter
  image_overlay_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  image_overlay_color: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: 'rgba(0,0,0,0.2)',
  },
  // Preview image (base64 or URL)
  preview_image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Is this a system template (available to all users)?
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Is this template active?
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'templates',
  timestamps: true,
  underscored: true,
});

module.exports = Template;
