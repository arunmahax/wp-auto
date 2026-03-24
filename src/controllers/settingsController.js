const settingsService = require('../services/settingsService');

async function get(req, res, next) {
  try {
    const settings = await settingsService.get(req.user.id);
    res.json(settings || {});
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const settings = await settingsService.upsert(req.user.id, req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = { get, upsert };
