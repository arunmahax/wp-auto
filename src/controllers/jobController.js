const jobService = require('../services/jobService');

async function create(req, res, next) {
  try {
    const job = await jobService.create(req.params.projectId, req.user.id, req.body);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const jobs = await jobService.listByProject(req.params.projectId, req.user.id);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const job = await jobService.getById(req.params.projectId, req.params.jobId, req.user.id);
    res.json(job);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await jobService.remove(req.params.projectId, req.params.jobId, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, remove };
