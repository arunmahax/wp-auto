const wpFetchService = require('../services/wpFetchService');

async function fetchCategories(req, res, next) {
  try {
    const categories = await wpFetchService.fetchCategories(req.params.id, req.user.id);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function fetchBoards(req, res, next) {
  try {
    const boards = await wpFetchService.fetchBoards(req.params.id, req.user.id);
    res.json({ boards });
  } catch (err) {
    next(err);
  }
}

module.exports = { fetchCategories, fetchBoards };
