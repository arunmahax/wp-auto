const cron = require('node-cron');
const { Project, Recipe, Job, Template } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const settingsService = require('./settingsService');
const contentWriterClient = require('./contentWriterClient');
const ttapiClient = require('./ttapiClient');
const pinGeneratorClient = require('./pinGeneratorClient');
const wpPublishService = require('./wpPublishService');

// Lazy-load pin generator service to avoid issues if canvas not available
let pinGeneratorService = null;
const getPinGeneratorService = () => {
  if (!pinGeneratorService) {
    try {
      pinGeneratorService = require('./pinGeneratorService');
    } catch (error) {
      console.error('[Scheduler] Pin generator service not available:', error.message);
    }
  }
  return pinGeneratorService;
};

// Active cron jobs keyed by project ID
const activeJobs = new Map();

// Failed recipe recovery job
let failedRecoveryJob = null;

// Max auto-retries for failed recipes
const MAX_AUTO_RETRIES = 3;

const INTERVAL_MAP = {
  '3h': '0 */3 * * *',
  '5h': '0 */5 * * *',
  '6h': '0 */6 * * *',
  '8h': '0 */8 * * *',
  '12h': '0 */12 * * *',
};

// ─── Concurrency control ────────────────────────────────────────────
// Max pipelines running at the same time across all projects
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_PIPELINES, 10) || 5;
let runningCount = 0;

/**
 * Recover orphaned recipes/jobs stuck in 'processing'/'running' from a previous crash.
 */
async function recoverOrphans() {
  const [orphanedRecipes] = await Recipe.update(
    { status: 'new', pipeline_step: null, error_message: 'Recovered after server restart' },
    { where: { status: 'processing' } },
  );
  const [orphanedJobs] = await Job.update(
    { status: 'failed', error_message: 'Server restarted during execution' },
    { where: { status: { [Op.in]: ['pending', 'running'] } } },
  );
  if (orphanedRecipes || orphanedJobs) {
    console.log(`[Scheduler] Recovered ${orphanedRecipes} orphaned recipes, ${orphanedJobs} orphaned jobs`);
  }
}

/**
 * Auto-recover failed recipes that haven't exceeded retry limit.
 * This ensures transient failures (TTAPI flakiness, network issues) are automatically retried.
 */
async function recoverFailedRecipes() {
  try {
    // Find failed recipes that:
    // 1. Haven't exceeded max retries
    // 2. Failed in the last 24 hours (avoid retrying ancient failures)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const failedRecipes = await Recipe.findAll({
      where: {
        status: 'failed',
        retry_count: { [Op.lt]: MAX_AUTO_RETRIES },
        updatedAt: { [Op.gte]: twentyFourHoursAgo },
      },
    });

    if (failedRecipes.length === 0) return;

    console.log(`[Scheduler] Auto-recovering ${failedRecipes.length} failed recipes...`);

    for (const recipe of failedRecipes) {
      const newRetryCount = (recipe.retry_count || 0) + 1;
      await recipe.update({
        status: 'new',
        pipeline_step: null,
        retry_count: newRetryCount,
        error_message: `Auto-retry #${newRetryCount} (previous: ${recipe.error_message?.substring(0, 100) || 'unknown'})`,
      });
      console.log(`[Scheduler] Re-queued recipe "${recipe.title}" (retry ${newRetryCount}/${MAX_AUTO_RETRIES})`);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to auto-recover recipes:', err.message);
  }
}

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
  // Recover any pipelines stuck from a previous crash/restart
  await recoverOrphans();

  // Also recover any failed recipes that can be auto-retried
  await recoverFailedRecipes();

  const projects = await Project.findAll({
    where: {
      trigger_enabled: true,
      trigger_interval: { [Op.ne]: 'disabled' },
    },
  });

  for (const project of projects) {
    registerProject(project);
  }

  // Start failed recipe auto-recovery job (runs every 15 minutes)
  failedRecoveryJob = cron.schedule('*/15 * * * *', () => {
    recoverFailedRecipes().catch((err) => {
      console.error('[Scheduler] Failed recipe recovery error:', err.message);
    });
  });
  console.log('[Scheduler] Started failed recipe auto-recovery (every 15 min)');

  console.log(`[Scheduler] Started ${projects.length} project triggers`);
}

/**
 * Stop all cron jobs (for graceful shutdown).
 */
function stopAll() {
  // Stop failed recovery job
  if (failedRecoveryJob) {
    failedRecoveryJob.stop();
    failedRecoveryJob = null;
  }

  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
  console.log('[Scheduler] Stopped all triggers');
}

/**
 * Full recipe processing pipeline (matching ImageFX Reference Architecture):
 *
 * 1. Generate 4 Midjourney images via TTAPI
 * 2. Upload images 1-3 to WordPress media library
 * 3. Generate article via Content Writer (with WP image URLs)
 * 4. Publish article to WordPress
 * 5. Generate Pinterest pin via Pin Designer (images 1 + 4)
 * 6. Upload pin to WP + submit to pinboards plugin
 * 7. Mark recipe completed
 */
async function processNextRecipe(projectId, userId, jobId = null) {
  // ─── Concurrency guard ──────────────────────────────────────────────
  if (runningCount >= MAX_CONCURRENT) {
    console.log(`[Scheduler] Concurrency limit reached (${runningCount}/${MAX_CONCURRENT}) — skipping project ${projectId}`);
    if (jobId) {
      await Job.update(
        { status: 'failed', error_message: `Server busy (${MAX_CONCURRENT} pipelines running). Try again shortly.`, pipeline_step: 'done' },
        { where: { id: jobId } },
      );
    }
    return null;
  }

  // ─── Atomic recipe claim (transaction) ──────────────────────────────
  let recipe;
  try {
    recipe = await sequelize.transaction(async (t) => {
      const r = await Recipe.findOne({
        where: { project_id: projectId, status: 'new' },
        order: [['createdAt', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!r) return null;
      await r.update({ status: 'processing', pipeline_step: 'starting' }, { transaction: t });
      return r;
    });
  } catch (lockErr) {
    console.error(`[Scheduler] Failed to claim recipe for project ${projectId}:`, lockErr.message);
    if (jobId) {
      await Job.update(
        { status: 'failed', error_message: 'Failed to claim recipe: ' + lockErr.message },
        { where: { id: jobId } },
      );
    }
    return null;
  }

  if (!recipe) {
    console.log(`[Scheduler] No new recipes for project ${projectId}`);
    if (jobId) {
      await Job.update(
        { status: 'failed', error_message: 'No new recipes to process', pipeline_step: 'done' },
        { where: { id: jobId } },
      );
    }
    return null;
  }

  // Link job to recipe and set running
  if (jobId) {
    await Job.update(
      { status: 'running', recipe_id: recipe.id, pipeline_step: 'starting' },
      { where: { id: jobId } },
    );
  }

  const updateJob = async (fields) => {
    if (jobId) await Job.update(fields, { where: { id: jobId } });
  };

  // Recipe already claimed as 'processing' inside the transaction above
  runningCount++;
  console.log(`[Scheduler] Processing recipe: ${recipe.title} (${runningCount}/${MAX_CONCURRENT} slots used)`);

  try {
    const project = await Project.findByPk(projectId);
    if (!project) throw new Error('Project not found');

    const keys = await settingsService.getRawKeys(userId);
    if (!keys) throw new Error('User settings not configured');

    // ─── Step 1: Generate Midjourney images via TTAPI ───────────────────
    await recipe.update({ pipeline_step: 'image_generation' });
    await updateJob({ pipeline_step: 'image_generation' });
    let mjImages = [];

    if (keys.ttapi_api_key) {
      const defaultTemplate = '{image} {title}, food photography, professional, high quality, appetizing, 4k --ar 16:9';
      const template = project.image_prompt_template || defaultTemplate;
      const spyImage = recipe.image1 || '';
      let prompt = template
        .replace(/\{title\}/gi, recipe.title)
        .replace(/\{image\}/gi, spyImage)
        .replace(/\u2014/g, '-')
        .replace(/\u2013/g, '-')
        .replace(/\s{2,}/g, ' ')
        .trim();
      console.log(`[Scheduler] Step 1: TTAPI imagine — ${recipe.title}`);

      const ttapiRes = await ttapiClient.imagine({
        apiKey: keys.ttapi_api_key,
        prompt,
      });

      mjImages = ttapiRes.imageUrls || [ttapiRes.imageUrl];
      await recipe.update({
        mj_image1: mjImages[0] || null,
        mj_image2: mjImages[1] || null,
        mj_image3: mjImages[2] || null,
        mj_image4: mjImages[3] || null,
      });
      console.log(`[Scheduler] Step 1 done: ${mjImages.length} images generated`);
    }

    // ─── Step 2: Upload images to WordPress ─────────────────────────────
    await recipe.update({ pipeline_step: 'image_upload' });
    await updateJob({ pipeline_step: 'image_upload' });
    let wpImages = { image1: null, image2: null, featuredImage: null, featuredMediaId: null };

    if (mjImages.length > 0) {
      console.log(`[Scheduler] Step 2: Uploading images to WordPress...`);
      wpImages = await wpPublishService.uploadRecipeImages(
        project,
        mjImages.slice(0, 3), // First 3 for article
        recipe.title,
      );
      await recipe.update({
        wp_image1: wpImages.image1,
        wp_image2: wpImages.image2,
        wp_featured_image: wpImages.featuredImage,
        wp_featured_media_id: wpImages.featuredMediaId,
      });
      console.log(`[Scheduler] Step 2 done: images uploaded to WP`);
    }

    // ─── Step 3: Generate article via Content Writer ────────────────────
    await recipe.update({ pipeline_step: 'article_generation' });
    await updateJob({ pipeline_step: 'article_generation' });
    let articleResult = null;
    let articleJobId = null;

    if (keys.content_api_url && keys.content_api_key) {
      console.log(`[Scheduler] Step 3: Content Writer — generating article...`);
      const contentRes = await contentWriterClient.generateRecipe({
        baseUrl: keys.content_api_url,
        apiKey: keys.content_api_key,
        title: recipe.title,
        image1: wpImages.image1 || recipe.image1,
        image2: wpImages.image2 || recipe.image2,
        featuredImage: wpImages.featuredImage || recipe.featured_image,
        categories: project.content_categories,
        authors: project.content_authors,
      });
      articleJobId = contentRes.jobId;
      articleResult = contentRes.result;
      await recipe.update({
        article_job_id: articleJobId,
        article_result: JSON.stringify(articleResult),
      });
      console.log(`[Scheduler] Step 3 done: article generated (job ${articleJobId})`);
    }

    // ─── Step 4: Publish to WordPress ───────────────────────────────────
    // (Internally: empty post → Tasty Recipe → enhance content → update → SEO)
    await recipe.update({ pipeline_step: 'publishing' });
    await updateJob({ pipeline_step: 'publishing' });
    let postId = null;
    let publishedUrl = null;
    let article = null;

    if (articleResult) {
      console.log(`[Scheduler] Step 4: Publishing to WordPress (post → Tasty Recipe → enhance → SEO)...`);
      article = wpPublishService.parseArticleResult(articleResult);

      // Replace database recipe title (with site name suffix) with shortTitle in content headers
      if (article.shortTitle && recipe.title && recipe.title !== article.shortTitle) {
        article.content = article.content.replaceAll(recipe.title, article.shortTitle);
      }

      const pubResult = await wpPublishService.publishArticle(project, article, wpImages);
      postId = pubResult.postId;
      publishedUrl = pubResult.url;
      await recipe.update({
        wp_post_id: postId,
        published_url: publishedUrl,
      });
      console.log(`[Scheduler] Step 4 done: published at ${publishedUrl}`);
    }

    // ─── Step 5: Generate Pinterest pin ─────────────────────────────────
    await recipe.update({ pipeline_step: 'pin_generation' });
    await updateJob({ pipeline_step: 'pin_generation' });
    let pinImageUrl = null;
    let pinImageBuffer = null;

    // Check if project has templates configured (internal pin generator)
    const templateIds = project.template_ids || [];
    console.log(`[Scheduler] Step 5: template_ids=${JSON.stringify(templateIds)}, raw=${project.getDataValue('template_ids')}, mjImages=${mjImages.length}`);
    if (templateIds.length > 0 && mjImages.length > 0) {
      try {
        console.log(`[Scheduler] Step 5: Generating Pinterest pin with template...`);
        
        // Randomly select a template from the configured list
        const selectedTemplateId = templateIds[Math.floor(Math.random() * templateIds.length)];
        console.log(`[Scheduler] Selected template ${selectedTemplateId} from ${templateIds.length} options`);
        
        // Load the template
        const template = await Template.findByPk(selectedTemplateId);
        if (!template) {
          console.warn(`[Scheduler] Template ${selectedTemplateId} not found, skipping pin generation`);
        } else {
          // Get pin generator service
          const pinGenService = getPinGeneratorService();
          if (pinGenService) {
            // Use image 1 (top) and image 4 or 2 (bottom)
            const topImg = mjImages[0];
            const bottomImg = mjImages[3] || mjImages[1] || mjImages[0];
            
            // Generate pin using internal service
            pinImageBuffer = await pinGenService.generatePin(template.toJSON(), {
              title: recipe.title,
              images: [topImg, bottomImg],
              website: template.website_text || '',
              subtitle: template.subtitle_text || '',
            });
            
            console.log(`[Scheduler] Step 5 done: pin image generated internally (${pinImageBuffer.length} bytes)`);
          } else {
            console.warn('[Scheduler] Pin generator service not available');
          }
        }
      } catch (pinErr) {
        console.error(`[Scheduler] Step 5 template generation failed (non-fatal):`, pinErr.message);
      }
    } 
    // Fall back to external pin generator service
    else if (keys.pin_generator_url && mjImages.length > 0) {
      try {
        console.log(`[Scheduler] Step 5: Generating Pinterest pin (external service)...`);
        // Use image 1 (top) and image 4 or image 2 (bottom)
        const topImg = mjImages[0];
        const bottomImg = mjImages[3] || mjImages[1] || mjImages[0];

        const pinRes = await pinGeneratorClient.createPin({
          baseUrl: keys.pin_generator_url,
          apiKey: keys.pin_generator_key || '',
          topImageUrl: topImg,
          bottomImageUrl: bottomImg,
          recipeTitle: recipe.title,
          designConfig: project.pin_design_config,
        });
        pinImageUrl = pinRes.pinImageUrl;
        await recipe.update({ pin_image_url: pinImageUrl });
        console.log(`[Scheduler] Step 5 done: pin image created`);
      } catch (pinErr) {
        console.error(`[Scheduler] Step 5 failed (non-fatal):`, pinErr.message);
      }
    }

    // ─── Step 6: Submit pin to WordPress pinboards ──────────────────────
    if ((pinImageUrl || pinImageBuffer) && postId) {
      try {
        await recipe.update({ pipeline_step: 'pin_submission' });
        await updateJob({ pipeline_step: 'pin_submission' });
        console.log(`[Scheduler] Step 6: Submitting pin to pinboard...`);

        // Upload pin image to WP media and get the WP URL
        const wpClient = wpPublishService.createWpClient(project);
        const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        let pinMedia;
        if (pinImageBuffer) {
          // Use buffer upload for internally generated pins
          pinMedia = await wpPublishService.uploadImageFromBuffer(
            wpClient, pinImageBuffer, `${slug}-pin.png`, recipe.title, 'image/png',
          );
        } else {
          // Use URL upload for external pin generator
          pinMedia = await wpPublishService.uploadImageFromUrl(
            wpClient, pinImageUrl, `${slug}-pin.jpg`, recipe.title,
          );
        }

        // Save the WordPress-hosted pin image URL
        await recipe.update({ wp_pin_image: pinMedia.url });
        console.log(`[Scheduler] Step 6: Pin uploaded to WordPress: ${pinMedia.url}`);

        // Fetch boards from Pinboards plugin and match by keywords
        const boards = await wpPublishService.fetchPinboards(wpClient);
        const board = wpPublishService.matchBoard(boards, recipe.title);

        if (!board) {
          console.log('[Scheduler] Step 6: No matching board found — skipping');
        } else {
          // Build pin data from article metadata
          const pinTitle = article?.title || recipe.title;
          const pinDescription = article?.seoDescription || article?.description || `${recipe.title} - Get the full recipe!`;
          const pinCategories = article?.category || '';
          const pinAuthor = project.wp_username || '';

          await wpPublishService.submitPinToBoard(wpClient, {
            boardSlug: board.slug,
            title: pinTitle,
            description: pinDescription,
            link: publishedUrl,
            image: pinMedia.url,
            author: pinAuthor,
            categories: pinCategories,
          });

          await recipe.update({
            pinterest_board: board.name || board.slug,
            pinterest_description: pinDescription,
            pinterest_title: pinTitle,
          });
          console.log(`[Scheduler] Step 6 done: pin submitted to "${board.name || board.slug}"`);
        }
      } catch (pinBoardErr) {
        console.error(`[Scheduler] Step 6 failed (non-fatal):`, pinBoardErr.message);
      }
    }

    // ─── Done ───────────────────────────────────────────────────────────
    await recipe.update({
      status: 'completed',
      pipeline_step: 'done',
      generated_image_url: mjImages[0] || null,
    });
    await updateJob({
      status: 'completed',
      pipeline_step: 'done',
      result_data: JSON.stringify({
        recipe_title: recipe.title,
        published_url: publishedUrl,
        post_id: postId,
        pin_image_url: pinImageUrl,
        pin_title: recipe.pinterest_title || null,
        pin_description: recipe.pinterest_description || null,
      }),
    });

    await project.update({ last_trigger_at: new Date() });
    console.log(`[Scheduler] ✓ Completed recipe: ${recipe.title}`);
    runningCount--;
    return recipe.toJSON();
  } catch (err) {
    const errorMsg = err.message || err.response?.data?.error || String(err) || 'Unknown error';
    await recipe.update({
      status: 'failed',
      error_message: errorMsg,
    });
    await updateJob({
      status: 'failed',
      error_message: errorMsg,
      pipeline_step: recipe.pipeline_step,
    });
    console.error(`[Scheduler] ✗ Recipe ${recipe.id} failed at step "${recipe.pipeline_step}":`, errorMsg);
    runningCount--;
    return null;
  }
}

/**
 * Simple keyword-based board selection.
 * Matches recipe title keywords to board names.
 */
function selectBoard(boards, recipeTitle) {
  if (!boards || boards.length === 0) return 'Recipes';

  const titleLower = recipeTitle.toLowerCase();

  // Try to match title keywords to board names
  for (const board of boards) {
    const boardLower = board.name.toLowerCase();
    // Check if any board keyword appears in the recipe title
    const boardWords = boardLower.split(/\s+/);
    for (const word of boardWords) {
      if (word.length > 3 && titleLower.includes(word)) {
        return board.name;
      }
    }
  }

  // Fallback: first board
  return boards[0].name;
}

function safeJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

module.exports = { registerProject, unregisterProject, startAll, stopAll, processNextRecipe, recoverOrphans, recoverFailedRecipes };
