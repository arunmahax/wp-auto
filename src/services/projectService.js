const { Project } = require('../models');
const { encrypt, decrypt } = require('./encryption');

async function create(userId, data) {
  const project = await Project.create({
    user_id: userId,
    name: data.name,
    wp_api_url: data.wp_api_url,
    wp_username: data.wp_username,
    wp_app_password: encrypt(data.wp_app_password),
    google_sheet_url: data.google_sheet_url || null,
    trigger_interval: data.trigger_interval || 'disabled',
    trigger_enabled: data.trigger_enabled || false,
    content_categories: data.content_categories || null,
    content_authors: data.content_authors || null,
  });

  return sanitize(project);
}

async function listByUser(userId) {
  const projects = await Project.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });

  return projects.map(sanitize);
}

async function getById(projectId, userId) {
  const project = await Project.findByPk(projectId);

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  if (project.user_id !== userId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return sanitize(project);
}

async function update(projectId, userId, data) {
  const project = await Project.findByPk(projectId);

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  if (project.user_id !== userId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  if (data.wp_app_password) {
    data.wp_app_password = encrypt(data.wp_app_password);
  }

  await project.update(data);
  return sanitize(project);
}

async function remove(projectId, userId) {
  const project = await Project.findByPk(projectId);

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  if (project.user_id !== userId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  await project.destroy();
  return { message: 'Project deleted successfully' };
}

// Strip encrypted wp_app_password from output
function sanitize(project) {
  const json = project.toJSON();
  delete json.wp_app_password;
  return json;
}

module.exports = { create, listByUser, getById, update, remove };
