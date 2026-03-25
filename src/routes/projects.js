const { Router } = require('express');
const projectController = require('../controllers/projectController');
const wpFetchController = require('../controllers/wpFetchController');
const sheetController = require('../controllers/sheetController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidator');
const scheduler = require('../services/scheduler');
const { Recipe, Job } = require('../models');

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

module.exports = router;
