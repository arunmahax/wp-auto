const projectService = require('../services/projectService');

async function create(req, res, next) {
  try {
    const project = await projectService.create(req.user.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const projects = await projectService.listByUser(req.user.id);
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const project = await projectService.getById(req.params.id, req.user.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.update(req.params.id, req.user.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await projectService.remove(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, remove };
