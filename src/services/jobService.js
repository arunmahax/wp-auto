const { Job, Project, Recipe } = require('../models');
const scheduler = require('./scheduler');

async function verifyProjectOwnership(projectId, userId) {
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

async function create(projectId, userId, data) {
  const project = await verifyProjectOwnership(projectId, userId);

  const job = await Job.create({
    project_id: projectId,
    type: data.type || 'pipeline',
    description: data.description || null,
  });

  // Launch the pipeline in the background
  scheduler.processNextRecipe(projectId, userId, job.id).catch((err) => {
    console.error(`[JobService] Pipeline failed for job ${job.id}:`, err.message);
  });

  return job;
}

async function listByProject(projectId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const jobs = await Job.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'DESC']],
  });

  return jobs;
}

async function getById(projectId, jobId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const job = await Job.findOne({
    where: { id: jobId, project_id: projectId },
  });

  if (!job) {
    const err = new Error('Job not found');
    err.status = 404;
    throw err;
  }

  return job;
}

async function retry(projectId, jobId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const job = await Job.findOne({
    where: { id: jobId, project_id: projectId },
  });

  if (!job) {
    const err = new Error('Job not found');
    err.status = 404;
    throw err;
  }

  if (job.status !== 'failed') {
    const err = new Error('Only failed jobs can be retried');
    err.status = 400;
    throw err;
  }

  // Reset linked recipe back to 'new' so it can be re-claimed
  if (job.recipe_id) {
    const recipe = await Recipe.findByPk(job.recipe_id);
    if (recipe) {
      await recipe.update({
        status: 'new',
        pipeline_step: null,
        error_message: null,
      });
    }
  }

  // Reset job
  await job.update({
    status: 'pending',
    pipeline_step: null,
    error_message: null,
    result_data: null,
  });

  // Re-launch pipeline in background
  scheduler.processNextRecipe(projectId, userId, job.id).catch((err) => {
    console.error(`[JobService] Retry pipeline failed for job ${job.id}:`, err.message);
  });

  return job;
}

async function remove(projectId, jobId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const job = await Job.findOne({
    where: { id: jobId, project_id: projectId },
  });

  if (!job) {
    const err = new Error('Job not found');
    err.status = 404;
    throw err;
  }

  await job.destroy();
  return { message: 'Job deleted successfully' };
}

async function cancel(projectId, jobId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const job = await Job.findOne({
    where: { id: jobId, project_id: projectId },
  });

  if (!job) {
    const err = new Error('Job not found');
    err.status = 404;
    throw err;
  }

  if (job.status !== 'pending' && job.status !== 'running') {
    const err = new Error(`Cannot cancel a ${job.status} job`);
    err.status = 400;
    throw err;
  }

  const result = await scheduler.cancelJob(jobId);
  return result;
}

module.exports = { create, listByProject, getById, retry, remove, cancel };
