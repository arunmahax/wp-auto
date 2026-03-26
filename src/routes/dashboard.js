const { Router } = require('express');
const auth = require('../middleware/auth');
const { Job, Project, Recipe } = require('../models');
const { Op } = require('sequelize');

const router = Router();
router.use(auth);

// GET /api/dashboard — aggregated stats + recent jobs across all user's projects
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all user's projects
    const projects = await Project.findAll({
      where: { user_id: userId },
      attributes: ['id', 'name'],
    });
    const projectIds = projects.map((p) => p.id);
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

    if (projectIds.length === 0) {
      return res.json({
        stats: { projects: 0, running: 0, completed: 0, failed: 0, queued: 0 },
        jobs: [],
      });
    }

    // Count jobs by status
    const jobCounts = await Job.findAll({
      where: { project_id: { [Op.in]: projectIds } },
      attributes: [
        'status',
        [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const countMap = {};
    jobCounts.forEach((r) => { countMap[r.status] = parseInt(r.count, 10); });

    // Count queued recipes (status = 'new')
    const queuedCount = await Recipe.count({
      where: { project_id: { [Op.in]: projectIds }, status: 'new' },
    });

    const stats = {
      projects: projects.length,
      running: (countMap.pending || 0) + (countMap.running || 0),
      completed: countMap.completed || 0,
      failed: countMap.failed || 0,
      queued: queuedCount,
    };

    // Recent jobs (latest 100) with recipe info
    const jobs = await Job.findAll({
      where: { project_id: { [Op.in]: projectIds } },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    // Batch-fetch linked recipes
    const recipeIds = jobs.map((j) => j.recipe_id).filter(Boolean);
    const recipes = recipeIds.length > 0
      ? await Recipe.findAll({ where: { id: { [Op.in]: recipeIds } } })
      : [];
    const recipeMap = Object.fromEntries(recipes.map((r) => [r.id, r]));

    const jobList = jobs.map((job) => {
      const recipe = recipeMap[job.recipe_id] || null;
      let resultData = null;
      try { resultData = job.result_data ? JSON.parse(job.result_data) : null; } catch { /* ignore */ }

      return {
        id: job.id,
        project_id: job.project_id,
        project_name: projectMap[job.project_id] || 'Unknown',
        type: job.type,
        status: job.status,
        pipeline_step: job.pipeline_step,
        error_message: job.error_message,
        result_data: resultData,
        recipe_id: job.recipe_id,
        recipe_title: recipe?.title || null,
        recipe_status: recipe?.status || null,
        pin_image_url: recipe?.pin_image_url || null,
        published_url: recipe?.published_url || resultData?.published_url || null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    });

    res.json({ stats, jobs: jobList, projects: projects.map(p => ({ id: p.id, name: p.name })) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
