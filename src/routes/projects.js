const { Router } = require('express');
const projectController = require('../controllers/projectController');
const wpFetchController = require('../controllers/wpFetchController');
const sheetController = require('../controllers/sheetController');
const rssSpyService = require('../services/rssSpyService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidator');
const scheduler = require('../services/scheduler');
const { Recipe, Job, Project } = require('../models');

const router = Router();

router.use(auth);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.list);
router.get('/:id', projectController.getById);
router.put('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', projectController.remove);

router.post('/:id/fetch-categories', wpFetchController.fetchCategories);
router.post('/:id/fetch-boards', wpFetchController.fetchBoards);
router.post('/:id/fetch-authors', wpFetchController.fetchAuthors);

router.post('/:id/sync-sheet', sheetController.syncSheet);
router.get('/:id/recipes', sheetController.listRecipes);

// Project stats: recipe counts by status + automation info
router.get('/:id/stats', async (req, res, next) => {
  try {
    const project = await require('../models').Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const recipes = await Recipe.findAll({ where: { project_id: req.params.id } });
    const jobs = await Job.findAll({ where: { project_id: req.params.id } });

    const recipeCounts = { total: 0, new: 0, processing: 0, completed: 0, failed: 0 };
    for (const r of recipes) {
      recipeCounts.total++;
      recipeCounts[r.status] = (recipeCounts[r.status] || 0) + 1;
    }

    const jobCounts = { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    for (const j of jobs) {
      jobCounts.total++;
      jobCounts[j.status] = (jobCounts[j.status] || 0) + 1;
    }

    // Automation info
    const automation = {
      enabled: project.trigger_enabled,
      interval: project.trigger_interval,
      last_trigger_at: project.last_trigger_at,
      has_sheet: !!project.google_sheet_url,
    };

    res.json({ recipeCounts, jobCounts, automation });
  } catch (err) {
    next(err);
  }
});

// Run a specific recipe by ID
router.post('/:id/recipes/:recipeId/run', async (req, res, next) => {
  try {
    const project = await require('../models').Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const recipe = await Recipe.findOne({
      where: { id: req.params.recipeId, project_id: req.params.id },
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    if (recipe.status !== 'new' && recipe.status !== 'failed') {
      return res.status(400).json({ error: `Recipe is ${recipe.status}, only new or failed recipes can be run` });
    }

    // Reset if failed
    if (recipe.status === 'failed') {
      await recipe.update({ status: 'new', pipeline_step: null, error_message: null });
    }

    // Create a job linked to this recipe
    const job = await Job.create({
      project_id: req.params.id,
      type: 'pipeline',
      description: `Pipeline: ${recipe.title}`,
      recipe_id: recipe.id,
    });

    // Launch in background
    scheduler.processNextRecipe(req.params.id, req.user.id, job.id).catch((err) => {
      console.error(`[Projects] Run recipe failed for job ${job.id}:`, err.message);
    });

    res.json({ message: 'Recipe pipeline started', job, recipe: { id: recipe.id, title: recipe.title } });
  } catch (err) {
    next(err);
  }
});

// Manual trigger: process the next 'new' recipe immediately
router.post('/:id/process-next', async (req, res, next) => {
  try {
    const result = await scheduler.processNextRecipe(req.params.id, req.user.id);
    if (!result) {
      return res.json({ message: 'No new recipes to process' });
    }
    res.json({ message: 'Recipe processed', recipe: result });
  } catch (err) {
    next(err);
  }
});

// Get pipeline status for a recipe
router.get('/:id/recipes/:recipeId/status', async (req, res, next) => {
  try {
    const recipe = await Recipe.findOne({
      where: { id: req.params.recipeId, project_id: req.params.id },
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json({
      id: recipe.id,
      title: recipe.title,
      status: recipe.status,
      pipeline_step: recipe.pipeline_step,
      error_message: recipe.error_message,
      mj_images: [recipe.mj_image1, recipe.mj_image2, recipe.mj_image3, recipe.mj_image4].filter(Boolean),
      wp_images: { image1: recipe.wp_image1, image2: recipe.wp_image2, featured: recipe.wp_featured_image },
      published_url: recipe.published_url,
      pin_image_url: recipe.pin_image_url,
      pinterest_board: recipe.pinterest_board,
    });
  } catch (err) {
    next(err);
  }
});

// Get detailed pipeline status for a job (with linked recipe data)
router.get('/:id/jobs/:jobId/pipeline', async (req, res, next) => {
  try {
    const job = await Job.findOne({
      where: { id: req.params.jobId, project_id: req.params.id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let recipe = null;
    if (job.recipe_id) {
      recipe = await Recipe.findByPk(job.recipe_id);
    }

    res.json({
      id: job.id,
      status: job.status,
      pipeline_step: job.pipeline_step,
      error_message: job.error_message,
      result_data: job.result_data ? JSON.parse(job.result_data) : null,
      recipe: recipe ? {
        id: recipe.id,
        title: recipe.title,
        status: recipe.status,
        pipeline_step: recipe.pipeline_step,
        error_message: recipe.error_message,
        mj_images: [recipe.mj_image1, recipe.mj_image2, recipe.mj_image3, recipe.mj_image4].filter(Boolean),
        wp_images: { image1: recipe.wp_image1, image2: recipe.wp_image2, featured: recipe.wp_featured_image },
        published_url: recipe.published_url,
        pin_image_url: recipe.pin_image_url,
        pinterest_board: recipe.pinterest_board,
        pinterest_description: recipe.pinterest_description,
        pinterest_title: recipe.pinterest_title,
      } : null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── RSS SPY ENDPOINTS ──

// Get suggested RSS feeds
router.get('/spy/suggested-feeds', (req, res) => {
  res.json({ feeds: rssSpyService.SUGGESTED_FEEDS });
});

// Fetch spy data from project's RSS feeds
router.get('/:id/spy/fetch', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rssFeeds = project.rss_feeds || [];
    console.log(`[Spy] Project ${req.params.id} has ${rssFeeds.length} RSS feeds configured`);
    
    if (rssFeeds.length === 0) {
      return res.json({ 
        items: [], 
        errors: [], 
        message: 'No RSS feeds configured. Add feeds in project settings and click Save.' 
      });
    }

    // Get existing recipe titles for deduplication
    const existingRecipes = await Recipe.findAll({
      where: { project_id: req.params.id },
      attributes: ['title'],
    });
    const existingTitles = existingRecipes.map(r => r.title);

    // Get keywords filter (optional)
    const keywords = project.spy_keywords || [];
    console.log(`[Spy] Keywords filter: ${keywords.length > 0 ? keywords.join(', ') : '(none)'}`);
    console.log(`[Spy] Existing recipes to skip: ${existingTitles.length}`);

    // Fetch all feeds
    const { items, errors, stats } = await rssSpyService.fetchAllFeeds(rssFeeds, existingTitles, keywords);

    console.log(`[Spy] Result: ${items.length} items, ${errors.length} feed errors`);
    if (stats) console.log(`[Spy] Stats: ${JSON.stringify(stats)}`);

    res.json({
      items,
      errors,
      totalFeeds: rssFeeds.length,
      totalItems: items.length,
      keywords: keywords.length > 0 ? keywords : null,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

// Add selected spy items to recipes queue
router.post('/:id/spy/add', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Validate and dedupe against existing recipes
    const existingRecipes = await Recipe.findAll({
      where: { project_id: req.params.id },
      attributes: ['title'],
    });
    const existingTitles = new Set(
      existingRecipes.map(r => r.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    const created = [];
    const skipped = [];

    for (const item of items) {
      if (!item.title) continue;

      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (existingTitles.has(normalizedTitle)) {
        skipped.push(item.title);
        continue;
      }

      // Create recipe with competitor source
      const recipe = await Recipe.create({
        project_id: req.params.id,
        title: item.title,
        source: 'competitor',
        spy_source_url: item.link || null,
        spy_source_domain: item.domain || null,
        image1: item.image || null,
        featured_image: item.image || null,
        status: 'new',
      });

      created.push({
        id: recipe.id,
        title: recipe.title,
        source: recipe.source,
      });

      // Mark as used to avoid duplicates within this batch
      existingTitles.add(normalizedTitle);
    }

    res.json({
      created,
      skipped,
      message: `Added ${created.length} recipes${skipped.length > 0 ? `, skipped ${skipped.length} duplicates` : ''}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
