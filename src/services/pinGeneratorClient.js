const axios = require('axios');

/**
 * Create a Pinterest pin image via the Pin Generator service.
 *
 * @param {Object} opts
 * @param {string} opts.baseUrl - Pin Generator base URL
 * @param {string} opts.apiKey - API key (optional, may be empty)
 * @param {string} opts.topImageUrl - Top image URL
 * @param {string} opts.bottomImageUrl - Bottom image URL
 * @param {string} opts.recipeTitle - Recipe title for the pin text
 * @param {Object} [opts.styleOverrides] - Optional style overrides
 * @returns {Promise<Object>} { pinImageUrl }
 */
async function createPin({ baseUrl, apiKey, topImageUrl, bottomImageUrl, recipeTitle, styleOverrides }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const { data } = await axios.post(`${baseUrl}/api/create-pin`, {
    topImageUrl,
    bottomImageUrl,
    recipeTitle,
    styleOverrides: styleOverrides || undefined,
  }, {
    headers,
    timeout: 60000,
  });

  const pinImageUrl = data.pinImageUrl || data.url || data.imageUrl;
  if (!pinImageUrl) throw new Error('Pin Generator did not return an image URL');

  return { pinImageUrl };
}

module.exports = { createPin };
