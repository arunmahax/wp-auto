const cron = require('node-cron');
const { Project, Recipe } = require('../models');
const { Op } = require('sequelize');
const settingsService = require('./settingsService');
const contentWriterClient = require('./contentWriterClient');
const ttapiClient = require('./ttapiClient');
const pinGeneratorClient = require('./pinGeneratorClient');

// Active cron jobs keyed by project ID
const activeJobs = new Map();

const INTERVAL_MAP = {
  '3h': '0 */3 * * *',
  '5h': '0 */5 * * *',
  '6h': '0 */6 * * *',
  '8h': '0 */8 * * *',
  '12h': '0 */12 * * *',
};

/**
 * Register (or re-register) a cron job for a project.
 * Call after project settings change or on server startup.
 */
function registerProject(project) {
  // Remove existing job if any
  unregisterProject(project.id);

  if (!project.trigger_enabled || project.trigger_interval === 'disabled') {
    return;
  }

  const cronExpr = INTERVAL_MAP[project.trigger_interval];
  if (!cronExpr) return;

  const job = cron.schedule(cronExpr, () => {
    processNextRecipe(project.id, project.user_id).catch((err) => {
      console.error(`[Scheduler] Error processing project ${project.id}:`, err.message);
    });
  });

  activeJobs.set(project.id, job);
  console.log(`[Scheduler] Registered project ${project.id} with interval ${project.trigger_interval}`);
}

/**
 * Unregister a project's cron job.
 */
function unregisterProject(projectId) {
  const existing = activeJobs.get(projectId);
  if (existing) {
    existing.stop();
    activeJobs.delete(projectId);
  }
}

/**
 * Register all active projects on server startup.
 */
async function startAll() {
  const projects = await Project.findAll({
    where: {
      trigger_enabled: true,
      trigger_interval: { [Op.ne]: 'disabled' },
    },
  });

  for (const project of projects) {
    registerProject(project);
  }

  console.log(`[Scheduler] Started ${projects.length} project triggers`);
}

/**
 * Stop all cron jobs (for graceful shutdown).
 */
function stopAll() {
  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
  console.log('[Scheduler] Stopped all triggers');
}

/**
 * Pick the next 'new' recipe for a project and run the full pipeline:
 * 1. Generate article via Content Writer
 * 2. Generate image via TTAPI Midjourney
 * 3. (Optional) Create pin via Pin Generator
 * 4. Mark recipe as completed
 */
async function processNextRecipe(projectId, userId) {
  // Get the oldest 'new' recipe
  const recipe = await Recipe.findOne({
    where: { project_id: projectId, status: 'new' },
    order: [['createdAt', 'ASC']],
  });

  if (!recipe) {
    console.log(`[Scheduler] No new recipes for project ${projectId}`);
    return null;
  }

  // Mark as processing
  await recipe.update({ status: 'processing' });

  try {
    // Get project settings
    const project = await Project.findByPk(projectId);
    if (!project) throw new Error('Project not found');

    // Get user's API keys
    const keys = await settingsService.getRawKeys(userId);
    if (!keys) throw new Error('User settings not configured');

    // Step 1: Content Writer — generate article
    let articleResult = null;
    let articleJobId = null;
    if (keys.content_api_url && keys.content_api_key) {
      const contentRes = await contentWriterClient.generateRecipe({
        baseUrl: keys.content_api_url,
        apiKey: keys.content_api_key,
        title: recipe.title,
        image1: recipe.image1,
        image2: recipe.image2,
        featuredImage: recipe.featured_image,
        categories: project.content_categories,
        authors: project.content_authors,
      });
      articleJobId = contentRes.jobId;
      articleResult = contentRes.result;
    }

    // Step 2: TTAPI — generate Midjourney image
    let generatedImageUrl = null;
    if (keys.ttapi_api_key) {
      const prompt = `${recipe.title}, food photography, professional, high quality, appetizing, 4k`;
      const ttapiRes = await ttapiClient.imagine({
        apiKey: keys.ttapi_api_key,
        prompt,
      });
      generatedImageUrl = ttapiRes.imageUrl;
    }

    // Step 3: Pin Generator (optional)
    if (keys.pin_generator_url && generatedImageUrl) {
      try {
        await pinGeneratorClient.createPin({
          baseUrl: keys.pin_generator_url,
          apiKey: keys.pin_generator_key || '',
          topImageUrl: recipe.image1 || generatedImageUrl,
          bottomImageUrl: generatedImageUrl,
          recipeTitle: recipe.title,
        });
      } catch (pinErr) {
        console.error(`[Scheduler] Pin generation failed for recipe ${recipe.id}:`, pinErr.message);
        // Non-fatal — continue with completion
      }
    }

    // Mark completed
    await recipe.update({
      status: 'completed',
      article_job_id: articleJobId,
      article_result: articleResult ? JSON.stringify(articleResult) : null,
      generated_image_url: generatedImageUrl,
    });

    // Update project last trigger time
    await project.update({ last_trigger_at: new Date() });

    console.log(`[Scheduler] Completed recipe ${recipe.id} (${recipe.title})`);
    return recipe.toJSON();
  } catch (err) {
    await recipe.update({
      status: 'failed',
      error_message: err.message,
    });
    console.error(`[Scheduler] Recipe ${recipe.id} failed:`, err.message);
    return null;
  }
}

module.exports = { registerProject, unregisterProject, startAll, stopAll, processNextRecipe };
