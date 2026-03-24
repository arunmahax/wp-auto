const { Job, Project } = require('../models');

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
  await verifyProjectOwnership(projectId, userId);

  const job = await Job.create({
    project_id: projectId,
    type: data.type,
    description: data.description || null,
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

module.exports = { create, listByProject, getById, remove };
