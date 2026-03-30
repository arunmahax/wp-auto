const sequelize = require('../config/database');

const User = require('./User');
const Project = require('./Project');
const Job = require('./Job');
const UserSettings = require('./UserSettings');
const Recipe = require('./Recipe');
const Template = require('./Template');

// Associations
User.hasMany(Project, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'user_id' });

Project.hasMany(Job, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Job.belongsTo(Project, { foreignKey: 'project_id' });
Job.belongsTo(Recipe, { foreignKey: 'recipe_id' });

User.hasOne(UserSettings, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserSettings.belongsTo(User, { foreignKey: 'user_id' });

Project.hasMany(Recipe, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Recipe.belongsTo(Project, { foreignKey: 'project_id' });

// Template associations
User.hasMany(Template, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Template.belongsTo(User, { foreignKey: 'user_id' });

// Project can have a default template
Project.belongsTo(Template, { foreignKey: 'template_id', as: 'template' });
Template.hasMany(Project, { foreignKey: 'template_id' });

module.exports = {
  sequelize,
  User,
  Project,
  Job,
  UserSettings,
  Recipe,
  Template,
};
