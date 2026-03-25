const axios = require('axios');
const { Project } = require('../models');
const { decrypt } = require('./encryption');

async function fetchCategories(projectId, userId) {
  const project = await getProjectWithCreds(projectId, userId);
  const wpBase = getWpBase(project.wp_api_url);

  const { data } = await axios.get(`${wpBase}/wp-json/wp/v2/categories`, {
    params: { per_page: 100 },
    headers: buildAuthHeader(project),
    timeout: 15000,
  });

  const categories = data.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    count: cat.count,
  }));

  await project.update({ wp_categories: JSON.stringify(categories) });
  return categories;
}

async function fetchBoards(projectId, userId) {
  const project = await getProjectWithCreds(projectId, userId);
  const wpBase = getWpBase(project.wp_api_url);

  const { data } = await axios.get(`${wpBase}/wp-json/pinboards/v1/boards`, {
    headers: buildAuthHeader(project),
    timeout: 15000,
  });

  const boards = Array.isArray(data) ? data.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    keywords: b.keywords || [],
    recipe_count: b.recipe_count || 0,
  })) : [];

  await project.update({ wp_pinboards: JSON.stringify(boards) });
  return boards;
}

async function fetchAuthors(projectId, userId) {
  const project = await getProjectWithCreds(projectId, userId);
  const wpBase = getWpBase(project.wp_api_url);

  const { data } = await axios.get(`${wpBase}/wp-json/wp/v2/users`, {
    params: { per_page: 100 },
    headers: buildAuthHeader(project),
    timeout: 15000,
  });

  const authors = data.map((u) => ({
    id: u.id,
    name: u.name,
    slug: u.slug,
  }));

  await project.update({ wp_authors: JSON.stringify(authors) });
  return authors;
}

async function getProjectWithCreds(projectId, userId) {
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
  return project;
}

// Extract WP site base URL from API URL like "https://site.com/wp-json/wp/v2"
function getWpBase(wpApiUrl) {
  const idx = wpApiUrl.indexOf('/wp-json');
  if (idx !== -1) return wpApiUrl.substring(0, idx);
  // Fallback: strip trailing segments
  return wpApiUrl.replace(/\/+$/, '');
}

function buildAuthHeader(project) {
  const password = decrypt(project.wp_app_password);
  const token = Buffer.from(`${project.wp_username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

module.exports = { fetchCategories, fetchBoards, fetchAuthors };
