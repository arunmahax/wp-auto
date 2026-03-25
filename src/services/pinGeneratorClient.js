const axios = require('axios');

/**
 * Create a Pinterest pin image via the Pin Designer service.
 * Composites two images with a title text overlay into a 9:16 pin.
 *
 * @param {Object} opts
 * @param {string} opts.baseUrl - Pin Designer base URL
 * @param {string} opts.apiKey - API key (optional)
 * @param {string} opts.topImageUrl - Top image URL (recipe photo)
 * @param {string} opts.bottomImageUrl - Bottom image URL (second recipe photo)
 * @param {string} opts.recipeTitle - Recipe title for text overlay
 * @returns {Promise<Object>} { pinImageUrl }
 */
async function createPin({ baseUrl, apiKey, topImageUrl, bottomImageUrl, recipeTitle, designConfig }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  // Build request body: start with design config, then overlay dynamic fields
  let body = {
    topImageUrl,
    bottomImageUrl,
    recipeTitle,
  };

  if (designConfig) {
    try {
      const config = typeof designConfig === 'string' ? JSON.parse(designConfig) : designConfig;
      body = { ...body, ...config };
    } catch (e) {
      console.error('[PinGenerator] Invalid pin_design_config JSON, using defaults:', e.message);
    }
  }

  // Always override dynamic fields
  body.topImageUrl = topImageUrl;
  body.bottomImageUrl = bottomImageUrl;
  body.recipeTitle = recipeTitle;

  const { data } = await axios.post(`${baseUrl}/api/create-pin`, body, {
    headers,
    timeout: 60000,
  });

  const pinImageUrl = data.pinImageUrl || data.imageUrl || data.url;
  if (!pinImageUrl) throw new Error('Pin Designer did not return an image URL');

  return { pinImageUrl };
}

module.exports = { createPin };
