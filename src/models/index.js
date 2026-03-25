const sequelize = require('../config/database');

const User = require('./User');
const Project = require('./Project');
const Job = require('./Job');
const UserSettings = require('./UserSettings');
const Recipe = require('./Recipe');

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

module.exports = {
  sequelize,
  User,
  Project,
  Job,
  UserSettings,
  Recipe,
};
