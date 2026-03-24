const sequelize = require('../config/database');

const User = require('./User');
const Project = require('./Project');
const Job = require('./Job');

// Associations
User.hasMany(Project, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'user_id' });

Project.hasMany(Job, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Job.belongsTo(Project, { foreignKey: 'project_id' });

module.exports = {
  sequelize,
  User,
  Project,
  Job,
};
