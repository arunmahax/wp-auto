const sheetService = require('../services/sheetService');

async function syncSheet(req, res, next) {
  try {
    const result = await sheetService.syncSheet(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listRecipes(req, res, next) {
  try {
    const recipes = await sheetService.listRecipes(req.params.id, req.user.id, {
      status: req.query.status || undefined,
    });
    res.json(recipes);
  } catch (err) {
    next(err);
  }
}

module.exports = { syncSheet, listRecipes };
