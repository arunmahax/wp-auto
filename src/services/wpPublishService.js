const axios = require('axios');
const { decrypt } = require('./encryption');

/**
 * WordPress publishing service — matches the reference ImageFX pipeline.
 *
 * Flow: Create empty post → Create Tasty Recipe → Enhance content
 *       (image placeholders + styling + shortcode) → Update post → SEO metadata
 */

// ─── WordPress Client ───────────────────────────────────────────────────────

/**
 * Create an axios client configured for WordPress REST API.
 * Uses Basic Auth with Application Passwords.
 * 
 * Timeout: 30 seconds (matches WordPress plugin http_request_timeout filter)
 */
function createWpClient(project) {
  const password = decrypt(project.wp_app_password);
  const token = Buffer.from(`${project.wp_username}:${password}`).toString('base64');
  const wpBase = getWpBase(project.wp_api_url);

  return axios.create({
    baseURL: wpBase,
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds - matches WP plugin sar_custom_http_request_timeout
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

function getWpBase(wpApiUrl) {
  const idx = wpApiUrl.indexOf('/wp-json');
  if (idx !== -1) return wpApiUrl.substring(0, idx);
  return wpApiUrl.replace(/\/+$/, '');
}

// ─── Retry Helper ───────────────────────────────────────────────────────────

/**
 * Retry a function up to maxRetries times with exponential backoff.
 * Does NOT retry auth (401) or permission (403) errors.
 */
async function withRetry(fn, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status === 401 || status === 403) throw err;

      const retryable = !status || status >= 500 ||
        ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.code) ||
        (err.message && err.message.includes('socket hang up'));

      if (!retryable || attempt === maxRetries) throw err;

      const delay = 1000 * Math.pow(1.5, attempt - 1);
      console.log(`[WP Publish] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

// ─── Media Upload ───────────────────────────────────────────────────────────

/**
 * Upload an image from a URL to the WordPress media library (with retry).
 */
async function uploadImageFromUrl(client, imageUrl, filename, altText) {
  return withRetry(async () => {
    const imgResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const contentType = imgResponse.headers['content-type'] || 'image/jpeg';

    const { data } = await client.post('/wp-json/wp/v2/media', imgResponse.data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    if (altText && data.id) {
      await client.post(`/wp-json/wp/v2/media/${data.id}`, {
        alt_text: altText,
      }).catch(() => {});
    }

    return {
      id: data.id,
      url: data.source_url || data.guid?.rendered,
    };
  });
}

/**
 * Upload image from buffer directly to WordPress
 * @param {AxiosInstance} client - WordPress API client
 * @param {Buffer} imageBuffer - Image buffer (PNG or JPEG)
 * @param {string} filename - Filename for the upload
 * @param {string} altText - Alt text for the image
 * @param {string} contentType - MIME type (default: image/png)
 */
async function uploadImageFromBuffer(client, imageBuffer, filename, altText, contentType = 'image/png') {
  return withRetry(async () => {
    const { data } = await client.post('/wp-json/wp/v2/media', imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 60000, // 60s for large buffers
    });

    if (altText && data.id) {
      await client.post(`/wp-json/wp/v2/media/${data.id}`, {
        alt_text: altText,
      }).catch(() => {});
    }

    return {
      id: data.id,
      url: data.source_url || data.guid?.rendered,
    };
  });
}

/**
 * Upload recipe images to WordPress.
 * Image 1 = finished dish (article body)
 * Image 2 = ingredient prep (article body)
 * Image 3 = hero shot (featured image)
 */
async function uploadRecipeImages(project, imageUrls, recipeTitle) {
  const client = createWpClient(project);
  const slug = recipeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const result = { image1: null, image2: null, featuredImage: null, featuredMediaId: null };

  if (imageUrls[0]) {
    const m = await uploadImageFromUrl(client, imageUrls[0], `${slug}-image-1.jpg`, `${recipeTitle} Image 1`);
    result.image1 = m.url;
  }

  if (imageUrls[1]) {
    const m = await uploadImageFromUrl(client, imageUrls[1], `${slug}-image-2.jpg`, `${recipeTitle} Image 2`);
    result.image2 = m.url;
  }

  if (imageUrls[2]) {
    const m = await uploadImageFromUrl(client, imageUrls[2], `${slug}-featured.jpg`, recipeTitle);
    result.featuredImage = m.url;
    result.featuredMediaId = m.id;
  } else if (imageUrls[0]) {
    const m = await uploadImageFromUrl(client, imageUrls[0], `${slug}-featured.jpg`, recipeTitle);
    result.featuredImage = m.url;
    result.featuredMediaId = m.id;
  }

  return result;
}

// ─── Data Extraction & Normalization ────────────────────────────────────────

/**
 * Parse the Content Writer result into a structured article object.
 * Multi-level nutrition extraction (5 fallback levels per field).
 */
function parseArticleResult(contentWriterResult) {
  const r = contentWriterResult.result || contentWriterResult;

  const extractNutrition = (key) => {
    return r[key]
      || r.nutrition?.[key]
      || r.Nutrition?.[key]
      || r.details?.[key]
      || r.Details?.[key]
      || r[`nutrition_${key}`]
      || '';
  };

  return {
    title: r.title || r.shortTitle || '',
    shortTitle: r.shortTitle || r.short_title || '',
    content: r.content || r.htmlContent || '',
    description: r.description || r.metaDescription || '',
    seoTitle: r.seo_title || r.seoTitle || r.title || '',
    seoDescription: r.seo_description || r.seoDescription || r.description || '',
    focusKeyword: r.focus_keyword || r.focusKeyword || r.shortTitle || r.short_title || '',
    ingredients: r.ingredients || '',
    instructions: r.instructions || '',
    prepTime: r.prepTime || r.prep_time || '',
    cookTime: r.cookTime || r.cook_time || '',
    totalTime: r.totalTime || r.total_time || '',
    additionalTimeLabel: r.additionalTimeLabel || r.additional_time_label || '', // e.g., "Marinating Time"
    additionalTimeValue: r.additionalTimeValue || r.additional_time_value || '', // e.g., "2 Hours"
    servings: r.servings || r.yield || '',
    servingSize: r.servingSize || r.serving_size || '', // e.g., "1 cup"
    category: r.category || '',
    cuisine: r.cuisine || '',
    method: r.method || r.cookingMethod || '', // e.g., "Baking", "Grilling"
    diet: r.diet || r.dietaryInfo || '', // e.g., "Vegan", "Keto", "Gluten-Free"
    difficulty: r.difficulty || '',
    notes: r.notes || r.tips || '',
    allergies: r.allergies || '',
    equipment: r.equipment || '',
    tags: r.tags || '',
    author: r.author || r.authorName || r.author_name || '', // Recipe author
    videoUrl: r.videoUrl || r.video_url || '', // Video embed URL
    calories: extractNutrition('calories'),
    fat: extractNutrition('fat') || extractNutrition('totalFat'),
    saturatedFat: extractNutrition('saturatedFat') || extractNutrition('saturated_fat'),
    unsaturatedFat: extractNutrition('unsaturatedFat') || extractNutrition('unsaturated_fat'),
    transFat: extractNutrition('transFat') || extractNutrition('trans_fat'),
    protein: extractNutrition('protein'),
    carbohydrates: extractNutrition('carbohydrates') || extractNutrition('carbs') || extractNutrition('totalCarbs'),
    fiber: extractNutrition('fiber'),
    sodium: extractNutrition('sodium'),
    sugar: extractNutrition('sugar'),
    cholesterol: extractNutrition('cholesterol'),
    images: r.images || {},
  };
}

// ─── Ingredient & Instruction Parsing ───────────────────────────────────────

/**
 * Parse various input formats into a plain-text string (one item per line).
 * Handles: plain string, array of strings, array of grouped objects, HTML lists.
 */
function parseArrayOrString(input) {
  if (!input) return '';

  if (typeof input === 'string') {
    if (input.includes('<li>')) {
      return input
        .replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, '')
        .replace(/<li>/gi, '')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n');
    }
    return input;
  }

  if (Array.isArray(input)) {
    const lines = [];
    for (const item of input) {
      if (typeof item === 'string') {
        lines.push(item);
      } else if (item && typeof item === 'object') {
        if (item.group && Array.isArray(item.items)) {
          // Grouped ingredients: { group: "Sauce", items: ["tomato", "spices"] }
          lines.push(`%%GROUP%%${item.group}`);
          lines.push(...item.items);
        } else if (item.step != null && item.content) {
          // Step instructions: { step: 1, title: "Prep", content: "..." }
          lines.push(item.title ? `${item.title}: ${item.content}` : item.content);
        } else if (item.text) {
          lines.push(item.text);
        }
      }
    }
    return lines.join('\n');
  }

  return String(input);
}

function formatIngredientsHtml(ingredients) {
  const text = parseArrayOrString(ingredients);
  if (!text) return '';
  const items = text.split('\n').filter(Boolean);
  // Build HTML with proper group headers for Tasty Recipes
  const parts = [];
  for (const item of items) {
    if (item.startsWith('%%GROUP%%')) {
      // Close previous list if any, add group header, start new list
      if (parts.length > 0) parts.push('</ul>');
      parts.push(`<p><strong>${item.replace('%%GROUP%%', '')}</strong></p>`);
      parts.push('<ul>');
    } else {
      // If no <ul> started yet, start one
      if (parts.length === 0 || !parts[parts.length - 1]?.startsWith('<ul')) {
        if (parts.length === 0) parts.push('<ul>');
      }
      parts.push(`  <li>${item}</li>`);
    }
  }
  // Close final list
  if (parts.some((p) => p === '<ul>')) parts.push('</ul>');
  return parts.join('\n');
}

function formatInstructionsHtml(instructions) {
  const text = parseArrayOrString(instructions);
  if (!text) return '';
  const items = text.split('\n').filter(Boolean);
  return '<ol>\n' + items.map((i) => `  <li>${i}</li>`).join('\n') + '\n</ol>';
}

// ─── Time Helpers ───────────────────────────────────────────────────────────

/**
 * Convert time strings like "480 Minutes" to "8 Hours", "495 Minutes" to "8 Hours 15 Minutes".
 */
function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();

  const match = str.match(/^(\d+)\s*(minutes?|mins?|hours?|hrs?)$/i);
  if (!match) return str;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const totalMinutes = (unit.startsWith('hour') || unit.startsWith('hr'))
    ? value * 60
    : value;

  if (totalMinutes < 60) return `${totalMinutes} Minutes`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (mins === 0) return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
  return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} ${mins} Minutes`;
}

// ─── Notes Formatting ───────────────────────────────────────────────────────

/**
 * Format notes as HTML list for Tasty Recipes.
 * Tasty Recipes expects HTML <ul><li> format for proper rendering.
 */
function formatNotesHtml(notes, allergies) {
  if (!notes && !allergies) return '';

  const parts = [];
  
  // Parse notes into array
  if (notes) {
    const noteText = parseArrayOrString(notes);
    const noteLines = noteText.split('\n').map(s => s.trim()).filter(Boolean);
    if (noteLines.length > 0) {
      parts.push('<ul>');
      for (const line of noteLines) {
        parts.push(`<li>${line}</li>`);
      }
      parts.push('</ul>');
    }
  }
  
  // Add allergy info as separate paragraph
  if (allergies) {
    parts.push(`<p><strong>Allergy Information:</strong> ${allergies}</p>`);
  }
  
  return parts.join('\n');
}

// ─── Yield/Servings Formatting ──────────────────────────────────────────────

/**
 * Format yield/servings for schema.org recipeYield.
 * Pinterest expects formats like "6 servings", "Serves 6", or "Makes 12 cookies".
 */
function formatYield(servings) {
  if (!servings) return '';
  const str = String(servings).trim();
  if (!str) return '';
  
  // If it already has text ("6 servings", "Serves 4-6", "Makes 12"), keep as-is
  if (/[a-zA-Z]/.test(str)) return str;
  
  // If it's just a number, add "servings" suffix
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    return `${num} ${num === 1 ? 'serving' : 'servings'}`;
  }
  
  return str;
}

// ─── Nutrition Helpers ──────────────────────────────────────────────────────

/**
 * Format nutrition value for Tasty Recipes schema.org output.
 * Schema.org expects format like "285 calories", "12g", "28g", etc.
 * 
 * Reference: https://schema.org/NutritionInformation
 */
function appendNutritionUnit(value, field) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  
  // Extract just the number if unit already present
  const numMatch = str.match(/^([\d.]+)/);
  const num = numMatch ? numMatch[1] : str;
  
  // If it already has a unit, return as-is
  if (/[a-zA-Z]$/.test(str)) return str;

  const mgFields = ['sodium', 'cholesterol'];
  const noUnitFields = ['calories'];

  // For schema.org, calories should be "XXX calories" 
  if (noUnitFields.includes(field)) return `${num} calories`;
  if (mgFields.includes(field)) return `${num}mg`;
  
  // All fat types, protein, carbs, fiber, sugar use grams
  return `${num}g`;
}

// ─── Image Placeholder Processing ───────────────────────────────────────────

/**
 * Replace [img_to_be_inserted]URL[img_to_be_inserted] markers with styled HTML.
 */
function processImagePlaceholders(content, title) {
  if (!content) return content;

  return content.replace(
    /\[img_to_be_inserted\](.*?)\[img_to_be_inserted\]/g,
    (_, imageUrl) => {
      return buildImageBlock(imageUrl.trim(), 'Recipe image');
    },
  );
}

/**
 * Manually insert images at strategic positions when Content Writer
 * didn't use [img_to_be_inserted] markers.
 * Reference pattern: image 1 after ~60% (Storage section), image 2 after ~80% (Pro Tips).
 */
function insertImagesManually(content, wpImages, title) {
  if (!content) return content;

  if (wpImages.image1 && !content.includes(wpImages.image1)) {
    const pos60 = Math.floor(content.length * 0.55);
    const insertAt = content.indexOf('</p>', pos60);
    if (insertAt !== -1) {
      const imgBlock = buildImageBlock(wpImages.image1, 'Recipe image');
      content = content.slice(0, insertAt + 4) + imgBlock + content.slice(insertAt + 4);
    }
  }

  if (wpImages.image2 && !content.includes(wpImages.image2)) {
    const pos80 = Math.floor(content.length * 0.78);
    const insertAt = content.indexOf('</aside>', pos80);
    if (insertAt !== -1) {
      const imgBlock = buildImageBlock(wpImages.image2, 'Recipe image');
      content = content.slice(0, insertAt + 8) + imgBlock + content.slice(insertAt + 8);
    } else {
      const altInsert = content.indexOf('</p>', pos80);
      if (altInsert !== -1) {
        const imgBlock = buildImageBlock(wpImages.image2, 'Recipe image');
        content = content.slice(0, altInsert + 4) + imgBlock + content.slice(altInsert + 4);
      }
    }
  }

  return content;
}

function buildImageBlock(url, alt) {
  return `<div class="recipe-image-container"><img src="${url}" alt="${alt}" class="recipe-image" /></div>`;
}

// ─── Content Enhancement ────────────────────────────────────────────────────

/**
 * Wrap standalone <h2> sections (not those inside <aside>) in
 * <div class="recipe-section"> to match the reference article structure.
 */
function styleArticleContent(content) {
  if (!content) return content;

  // Split content into segments by top-level <aside> and <h2> blocks.
  // Only wrap <h2> sections that are NOT inside <aside> elements.
  const parts = [];
  let remaining = content;

  while (remaining.length > 0) {
    const asideStart = remaining.indexOf('<aside');
    const h2Start = remaining.indexOf('<h2');

    // No more structural tags — push rest and break
    if (asideStart === -1 && h2Start === -1) {
      parts.push(remaining);
      break;
    }

    // Determine which tag comes first
    const nextAside = asideStart === -1 ? Infinity : asideStart;
    const nextH2 = h2Start === -1 ? Infinity : h2Start;

    if (nextAside < nextH2) {
      // Push text before <aside>
      if (nextAside > 0) parts.push(remaining.substring(0, nextAside));
      // Find closing </aside>
      const asideEnd = remaining.indexOf('</aside>', nextAside);
      if (asideEnd !== -1) {
        parts.push(remaining.substring(nextAside, asideEnd + 8));
        remaining = remaining.substring(asideEnd + 8);
      } else {
        parts.push(remaining.substring(nextAside));
        break;
      }
    } else {
      // Push text before <h2>
      if (nextH2 > 0) parts.push(remaining.substring(0, nextH2));

      // Find the extent of this h2 section: up to next <h2>, <aside>, or end
      const afterH2 = remaining.substring(nextH2);
      let sectionEnd = afterH2.length;

      // Look for next <h2> or <aside> after the opening tag
      const tagEnd = afterH2.indexOf('>', 0) + 1;
      const nextStructural = [afterH2.indexOf('<h2', tagEnd), afterH2.indexOf('<aside', tagEnd)]
        .filter((p) => p > 0);
      if (nextStructural.length > 0) sectionEnd = Math.min(...nextStructural);

      const section = afterH2.substring(0, sectionEnd);
      parts.push('<div class="recipe-section">' + section + '</div>\n\n');
      remaining = afterH2.substring(sectionEnd);
    }
  }

  return parts.join('');
}

/**
 * Full content enhancement: process image placeholders, style content,
 * insert Tasty Recipe shortcode after first <h2>.
 */
function enhanceContentWithRecipeCard(content, tastyRecipeId, title, wpImages) {
  // 1. Process [img_to_be_inserted] markers
  if (content.includes('[img_to_be_inserted]')) {
    content = processImagePlaceholders(content, title);
  } else {
    content = insertImagesManually(content, wpImages, title);
  }

  // 2. Wrap standalone <h2> sections in <div class="recipe-section">
  content = styleArticleContent(content);

  // 3. Append shortcode at the very end (matches reference article)
  const shortcode = `[tasty-recipe id="${tastyRecipeId}"]`;
  content += '\n\n\n' + shortcode;

  return content;
}

/**
 * Fallback when Tasty Recipe creation fails — basic recipe info block.
 */
function enhanceContentWithoutRecipeCard(content, article, title, wpImages) {
  if (content.includes('[img_to_be_inserted]')) {
    content = processImagePlaceholders(content, title);
  } else {
    content = insertImagesManually(content, wpImages, title);
  }

  content = styleArticleContent(content);

  const parts = [];
  if (article.prepTime) parts.push(`Prep Time: ${article.prepTime}`);
  if (article.cookTime) parts.push(`Cook Time: ${article.cookTime}`);
  if (article.totalTime) parts.push(`Total Time: ${article.totalTime}`);
  if (article.servings) parts.push(`Servings: ${article.servings}`);

  if (parts.length > 0) {
    content += `\n<div class="basic-recipe-info" style="background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5em; margin: 2em 0;">
  <h3 style="margin-top: 0;">Recipe Details</h3>
  <p>${parts.join(' | ')}</p>
</div>`;
  }

  return content;
}

// ─── Category Selection (6-level algorithm) ─────────────────────────────────

function selectCategories(project, article) {
  const wpCats = safeJson(project.wp_categories);
  if (!wpCats || wpCats.length === 0) return [];

  const titleLower = (article.title || '').toLowerCase();
  const articleCat = (article.category || '').toLowerCase();

  // Level 1: Non-breakfast override
  const breakfastTerms = ['breakfast', 'pancake', 'waffle', 'oatmeal', 'eggs benedict', 'french toast'];
  const nonBreakfastTerms = ['pasta', 'steak', 'dinner', 'roast', 'curry', 'tacos', 'burrito', 'soup', 'stew'];
  const isBreakfastTitle = breakfastTerms.some((t) => titleLower.includes(t));
  const isNonBreakfast = nonBreakfastTerms.some((t) => titleLower.includes(t));
  if (!isBreakfastTitle && isNonBreakfast && articleCat === 'breakfast') {
    const dinnerCat = wpCats.find((c) => /dinner|main/i.test(c.name));
    if (dinnerCat) return [dinnerCat.id];
  }

  // Level 2: Exact category match
  const exactMatch = wpCats.find((c) => c.name.toLowerCase() === articleCat);
  if (exactMatch) return [exactMatch.id];

  // Level 3: Title keyword analysis
  const keywordMap = {
    dinner: ['dinner', 'steak', 'roast', 'curry', 'soup', 'stew', 'pasta', 'casserole'],
    breakfast: ['breakfast', 'pancake', 'waffle', 'oatmeal', 'eggs'],
    dessert: ['dessert', 'cake', 'cookie', 'pie', 'brownie', 'chocolate', 'ice cream'],
    lunch: ['lunch', 'sandwich', 'salad', 'wrap', 'bowl'],
    crockpot: ['crockpot', 'slow cooker', 'crock pot', 'slow-cooker'],
    chicken: ['chicken', 'poultry'],
    mexican: ['taco', 'burrito', 'enchilada', 'carnitas', 'quesadilla'],
    italian: ['pasta', 'parmesan', 'lasagna', 'risotto', 'pizza'],
  };

  for (const [keyword, triggers] of Object.entries(keywordMap)) {
    if (triggers.some((t) => titleLower.includes(t))) {
      const cat = wpCats.find((c) => c.name.toLowerCase().includes(keyword));
      if (cat) return [cat.id];
    }
  }

  // Level 4: Cuisine type matching
  if (article.cuisine) {
    const cuisineCat = wpCats.find((c) =>
      c.name.toLowerCase().includes(article.cuisine.toLowerCase()),
    );
    if (cuisineCat) return [cuisineCat.id];
  }

  // Level 5: Difficulty level matching
  if (article.difficulty) {
    const diffCat = wpCats.find((c) =>
      c.name.toLowerCase().includes(article.difficulty.toLowerCase()),
    );
    if (diffCat) return [diffCat.id];
  }

  // Level 6: Smart random — filter out Breakfast for non-breakfast
  const filtered = isBreakfastTitle
    ? wpCats
    : wpCats.filter((c) => !/breakfast/i.test(c.name));

  if (filtered.length > 0) {
    return [filtered[Math.floor(Math.random() * filtered.length)].id];
  }

  return [wpCats[0].id];
}

function selectAuthor(project) {
  const authors = safeJson(project.wp_authors);
  if (!authors || authors.length === 0) return undefined;
  return authors[Math.floor(Math.random() * authors.length)].id;
}

// ─── Main Publishing Flow ───────────────────────────────────────────────────

/**
 * Publish a complete article to WordPress following the reference pipeline:
 *
 * 1. Create WP post (empty content, with featured image + categories + author)
 * 2. Create Tasty Recipe card (with fallback)
 * 3. Enhance content (image placeholders → styled <img>, CSS classes, shortcode)
 * 4. Update post with final enhanced content
 * 5. Add SEO metadata (separate step, non-blocking)
 */
async function publishArticle(project, article, wpImages) {
  const client = createWpClient(project);
  const categoryIds = selectCategories(project, article);
  const authorId = selectAuthor(project);
  const postTitle = article.title || '';
  const slug = postTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Step A: Create WordPress post with EMPTY content
  const postData = {
    title: postTitle,
    content: '',
    status: 'publish',
    slug,
    excerpt: article.description,
    featured_media: wpImages.featuredMediaId || undefined,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    author: authorId,
  };

  const { data: post } = await client.post('/wp-json/wp/v2/posts', postData);
  console.log(`[WP Publish] Created post #${post.id}: ${post.link}`);

  // Step B: Create Tasty Recipe card
  let tastyRecipeId = null;
  let enhancedContent;

  try {
    article._featuredMediaId = wpImages.featuredMediaId;
    tastyRecipeId = await createTastyRecipe(client, post.id, article);
    console.log(`[WP Publish] Created Tasty Recipe #${tastyRecipeId} for post #${post.id}`);
  } catch (err) {
    console.log(`[WP Publish] Tasty Recipe failed (using fallback): ${err.message}`);
  }

  // Step C: Enhance content
  if (tastyRecipeId) {
    enhancedContent = enhanceContentWithRecipeCard(
      article.content, tastyRecipeId, article.title, wpImages,
    );
  } else {
    enhancedContent = enhanceContentWithoutRecipeCard(
      article.content, article, article.title, wpImages,
    );
  }

  // Step D: Update post with final content
  await client.post(`/wp-json/wp/v2/posts/${post.id}`, {
    content: enhancedContent,
  });
  console.log(`[WP Publish] Updated post #${post.id} with enhanced content`);

  // Step E: Add SEO metadata (non-blocking)
  await addSEOMetadata(client, post.id, article).catch((err) => {
    console.log(`[WP Publish] SEO metadata failed (non-fatal): ${err.message}`);
  });

  return {
    postId: post.id,
    url: post.link,
    categoryIds,
  };
}

// ─── Tasty Recipe Creation ──────────────────────────────────────────────────

/**
 * Create a Tasty Recipes custom post linked to the article.
 * Returns the Tasty Recipe post ID.
 * 
 * Full field reference (from tasty-recipes-seo-meta-integration.php):
 * author_name, _thumbnail_id, description, ingredients, instructions,
 * notes, keywords, nutrifox_id, video_url, prep_time,
 * additional_time_label, additional_time_value, cook_time, total_time, yield,
 * category, method, cuisine, diet, serving_size,
 * calories, sugar, sodium, fat, saturated_fat,
 * unsaturated_fat, trans_fat, carbohydrates, fiber, protein,
 * cholesterol, _tasty_recipe_parents
 */
async function createTastyRecipe(client, parentPostId, article) {
  const ingredientsHtml = formatIngredientsHtml(article.ingredients);
  const instructionsHtml = formatInstructionsHtml(article.instructions);
  const equipmentHtml = article.equipment ? formatIngredientsHtml(article.equipment) : '';

  // Format notes as HTML list for proper rendering
  const notesHtml = formatNotesHtml(article.notes, article.allergies);

  // Format category - capitalize first letter for proper display
  const formattedCategory = article.category 
    ? article.category.charAt(0).toUpperCase() + article.category.slice(1).toLowerCase()
    : '';
  
  // Format cuisine - capitalize first letter for proper display  
  const formattedCuisine = article.cuisine
    ? article.cuisine.charAt(0).toUpperCase() + article.cuisine.slice(1).toLowerCase()
    : '';

  // Format cooking method (e.g., "Baking", "Grilling", "Stovetop")
  const formattedMethod = article.method
    ? article.method.charAt(0).toUpperCase() + article.method.slice(1).toLowerCase()
    : '';

  // Format diet type (e.g., "Vegan", "Gluten-Free", "Keto")
  const formattedDiet = article.diet
    ? article.diet.charAt(0).toUpperCase() + article.diet.slice(1).toLowerCase()
    : '';

  const payload = {
    title: article.shortTitle || article.title,
    content: article.description || '',
    status: 'publish',
    parent: parentPostId,
    featured_media: article._featuredMediaId || undefined,
    meta: {
      // Core fields
      _thumbnail_id: article._featuredMediaId ? String(article._featuredMediaId) : '',
      _tasty_recipe_parents: String(parentPostId), // Link to parent post
      author_name: article.author || '', // Recipe author name
      description: article.description ? `<p>${article.description}</p>` : '',
      ingredients: ingredientsHtml,
      instructions: instructionsHtml,
      equipment: equipmentHtml || '',
      notes: notesHtml,
      keywords: article.tags || '',
      video_url: article.videoUrl || '', // Support video embedding
      
      // Time fields
      prep_time: formatTimeDisplay(article.prepTime),
      cook_time: formatTimeDisplay(article.cookTime),
      total_time: formatTimeDisplay(article.totalTime),
      additional_time_label: article.additionalTimeLabel || '', // e.g., "Marinating Time"
      additional_time_value: article.additionalTimeValue || '', // e.g., "2 Hours"
      
      // Classification fields
      yield: formatYield(article.servings),
      serving_size: article.servingSize || '', // e.g., "1 cup", "2 slices"
      category: formattedCategory,
      cuisine: formattedCuisine,
      method: formattedMethod, // Cooking method
      diet: formattedDiet, // Dietary info for schema.org
      
      // Nutrition - schema.org expects proper units
      calories: appendNutritionUnit(article.calories, 'calories'),
      fat: appendNutritionUnit(article.fat, 'fat'),
      saturated_fat: appendNutritionUnit(article.saturatedFat, 'saturatedFat'),
      unsaturated_fat: appendNutritionUnit(article.unsaturatedFat, 'unsaturatedFat'),
      trans_fat: appendNutritionUnit(article.transFat, 'transFat'),
      protein: appendNutritionUnit(article.protein, 'protein'),
      carbohydrates: appendNutritionUnit(article.carbohydrates, 'carbohydrates'),
      fiber: appendNutritionUnit(article.fiber, 'fiber'),
      sodium: appendNutritionUnit(article.sodium, 'sodium'),
      sugar: appendNutritionUnit(article.sugar, 'sugar'),
      cholesterol: appendNutritionUnit(article.cholesterol, 'cholesterol'),
    },
  };

  const { data: tastyPost } = await client.post('/wp-json/wp/v2/tasty_recipe', payload);
  return tastyPost.id;
}

// ─── SEO Metadata ───────────────────────────────────────────────────────────

/**
 * Add SEO metadata to a post.
 * 
 * IMPORTANT: Only send fields that are registered via register_post_meta()
 * in the WordPress plugin (tasty-recipes-seo-meta-integration.php).
 * 
 * Registered fields:
 * - Yoast: _yoast_wpseo_title, _yoast_wpseo_metadesc, _yoast_wpseo_focuskw
 * - Rank Math: rank_math_title, rank_math_description, rank_math_focus_keyword
 * 
 * Fields NOT registered (do not send): _yoast_wpseo_meta_robots_*, rank_math_robots
 */
async function addSEOMetadata(client, postId, article, retries = 2) {
  // Build clean SEO title with focus keyword and site branding
  const seoTitle = article.seoTitle || article.title || '';
  const seoDescription = article.seoDescription || article.description || '';
  const focusKeyword = article.focusKeyword || article.shortTitle || '';
  
  // Only include registered meta fields - extras get silently ignored by WP
  const meta = {
    // Yoast SEO fields
    _yoast_wpseo_title: seoTitle,
    _yoast_wpseo_metadesc: seoDescription,
    _yoast_wpseo_focuskw: focusKeyword,
    // Rank Math fields
    rank_math_title: seoTitle,
    rank_math_description: seoDescription,
    rank_math_focus_keyword: focusKeyword,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.post(`/wp-json/wp/v2/posts/${postId}`, { meta });
      console.log(`[WP Publish] SEO metadata added for post #${postId} (focus: "${focusKeyword}")`);
      return;
    } catch (err) {
      console.log(`[WP Publish] SEO metadata attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

// ─── Pinterest Board Submission (Pinboards Manager Plugin) ──────────────────

/**
 * Fetch boards from the Pinboards Manager plugin.
 * Uses the same WP Basic Auth as other REST API calls.
 */
async function fetchPinboards(client) {
  const { data } = await client.get('/wp-json/pinboards/v1/boards');
  return data;
}

/**
 * Match a board using the category-to-board mapping from project settings.
 * If a mapping exists for the chosen WP category, use it directly.
 * Falls back to keyword-based matchBoard() if no mapping found.
 */
function matchBoardByCategory(boards, recipeTitle, project, categoryIds) {
  if (!boards || boards.length === 0) return null;

  // Try category-board mapping first
  const mapping = project.category_board_map || {};
  if (categoryIds && categoryIds.length > 0 && Object.keys(mapping).length > 0) {
    for (const catId of categoryIds) {
      const boardSlug = mapping[String(catId)];
      if (boardSlug) {
        const board = boards.find((b) => b.slug === boardSlug);
        if (board) {
          console.log(`[WP Publish] Board matched via category mapping: category ${catId} → board "${board.name}"`);
          return board;
        }
      }
    }
  }

  // Fallback to keyword-based matching
  return matchBoard(boards, recipeTitle);
}

/**
 * Match a board to the recipe by comparing board keywords to the title.
 * Falls back to the first board if no keyword match found.
 */
function matchBoard(boards, recipeTitle) {
  if (!boards || boards.length === 0) return null;

  const titleLower = recipeTitle.toLowerCase();

  for (const board of boards) {
    const keywords = (board.keywords || '').toLowerCase().split(',').map((k) => k.trim()).filter(Boolean);
    for (const kw of keywords) {
      if (kw.length > 2 && titleLower.includes(kw)) {
        return board;
      }
    }
  }

  // Fallback: match board name words
  for (const board of boards) {
    const nameWords = (board.name || '').toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 3 && titleLower.includes(word)) {
        return board;
      }
    }
  }

  return boards[0];
}

/**
 * Submit a pin to the Pinboards Manager plugin.
 *
 * API: POST /wp-json/pinboards/v1/add-recipe
 * Fields: board_slug, title, description, link, image, author, categories
 */
async function submitPinToBoard(client, { boardSlug, title, description, link, image, author, categories }) {
  const { data } = await client.post('/wp-json/pinboards/v1/add-recipe', {
    board_slug: boardSlug,
    title,
    description,
    link,
    image,
    author: author || '',
    categories: categories || '',
  });

  console.log(`[WP Publish] Submitted pin to board "${boardSlug}" — ${title}`);
  return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  createWpClient,
  uploadImageFromUrl,
  uploadImageFromBuffer,
  uploadRecipeImages,
  parseArticleResult,
  publishArticle,
  createTastyRecipe,
  fetchPinboards,
  matchBoard,
  matchBoardByCategory,
  selectCategories,
  submitPinToBoard,
};
