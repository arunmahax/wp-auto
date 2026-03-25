const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { Project, Recipe } = require('../models');

/**
 * Extract spreadsheet ID and optional gid from a Google Sheets URL.
 * Supports: https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
 *           https://docs.google.com/spreadsheets/d/{ID}/edit?gid={GID}
 */
function parseSheetUrl(url) {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) throw Object.assign(new Error('Invalid Google Sheet URL'), { status: 400 });

  const spreadsheetId = idMatch[1];

  let gid = '0';
  const gidMatch = url.match(/[#?&]gid=(\d+)/);
  if (gidMatch) gid = gidMatch[1];

  return { spreadsheetId, gid };
}

/**
 * Download and parse public Google Sheet as CSV.
 * Expected columns: title, image1, image2 (header row required).
 */
async function fetchSheetRows(sheetUrl) {
  const { spreadsheetId, gid } = parseSheetUrl(sheetUrl);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  const { data: csvText } = await axios.get(csvUrl, { timeout: 30000 });

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) return [];

  // Flexible column mapping — find the right column by checking common names
  const headers = Object.keys(records[0]);
  const titleCol = findColumn(headers, ['title', 'spy title', 'recipe title', 'name', 'recipe name']);
  const image1Col = findColumn(headers, ['image1', 'spy image url', 'image url', 'image', 'img1', 'spy image']);
  const image2Col = findColumn(headers, ['image2', 'images', 'image 2', 'img2', 'second image']);

  if (!titleCol) {
    throw Object.assign(
      new Error(`No title column found. Sheet headers: ${headers.join(', ')}`),
      { status: 400 }
    );
  }

  return records
    .filter((r) => r[titleCol] && r[titleCol].trim())
    .map((r) => ({
      title: r[titleCol].trim(),
      image1: image1Col ? (r[image1Col] || '').trim() || null : null,
      image2: image2Col ? (r[image2Col] || '').trim() || null : null,
    }));
}

/**
 * Find a column header by checking against a list of common names (case-insensitive).
 */
function findColumn(headers, candidates) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

/**
 * Sync recipes from Google Sheet into the database.
 * Deduplicates by title — existing recipes with the same title are skipped.
 */
async function syncSheet(projectId, userId) {
  const project = await Project.findByPk(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (project.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (!project.google_sheet_url) throw Object.assign(new Error('No Google Sheet URL configured'), { status: 400 });

  const rows = await fetchSheetRows(project.google_sheet_url);

  // Get existing titles for dedup
  const existing = await Recipe.findAll({
    where: { project_id: projectId },
    attributes: ['title'],
  });
  const existingTitles = new Set(existing.map((r) => r.title.toLowerCase()));

  const newRows = rows.filter((r) => !existingTitles.has(r.title.toLowerCase()));

  const created = [];
  for (const row of newRows) {
    const recipe = await Recipe.create({
      project_id: projectId,
      title: row.title,
      image1: row.image1,
      image2: row.image2,
    });
    created.push(recipe.toJSON());
  }

  return {
    total_in_sheet: rows.length,
    already_existed: rows.length - newRows.length,
    imported: created.length,
    recipes: created,
  };
}

/**
 * List recipes for a project with optional status filter.
 */
async function listRecipes(projectId, userId, { status } = {}) {
  const project = await Project.findByPk(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (project.user_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const where = { project_id: projectId };
  if (status) where.status = status;

  const recipes = await Recipe.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  return recipes.map((r) => r.toJSON());
}

module.exports = { syncSheet, listRecipes, parseSheetUrl, fetchSheetRows };
