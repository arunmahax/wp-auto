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
  wp_authors: {
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
  image_prompt_template: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pin_design_config: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_trigger_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // RSS feeds for competitor spy
  rss_feeds: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('rss_feeds');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('rss_feeds', val ? JSON.stringify(val) : null);
    },
  },
  spy_keywords: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('spy_keywords');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('spy_keywords', val ? JSON.stringify(val) : null);
    },
  },
  // Templates for pin generation (array of template IDs - picks randomly)
  template_ids: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('template_ids');
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue('template_ids', val && val.length ? JSON.stringify(val) : null);
    },
  },
  // Maps WP category IDs to Pinterest board slugs: { "<categoryId>": "<boardSlug>" }
  category_board_map: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('category_board_map');
      if (!raw) return {};
      try { return JSON.parse(raw); } catch { return {}; }
    },
    set(val) {
      this.setDataValue('category_board_map', val && Object.keys(val).length ? JSON.stringify(val) : null);
    },
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
