const axios = require('axios');

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 120000;

/**
 * Submit a recipe generation job and poll until complete.
 *
 * @param {Object} opts
 * @param {string} opts.baseUrl - Content Writer API base URL
 * @param {string} opts.apiKey - x-api-key
 * @param {string} opts.title - Recipe title
 * @param {string} opts.image1 - First image URL
 * @param {string} opts.image2 - Second image URL (optional)
 * @param {string} opts.featuredImage - Featured image URL (optional)
 * @param {string} opts.categories - Category string e.g. "Dinner (5), Desserts (12)"
 * @param {string} opts.authors - Author string e.g. "John (1), Jane (2)"
 * @returns {Promise<Object>} { jobId, result }
 */
async function generateRecipe({ baseUrl, apiKey, title, image1, image2, featuredImage, categories, authors }) {
  const client = axios.create({
    baseURL: baseUrl,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // Submit job
  const { data: submitRes } = await client.post('/api/generate-recipe', {
    title,
    image1: image1 || undefined,
    image2: image2 || undefined,
    featuredImage: featuredImage || undefined,
    categories: categories || undefined,
    authors: authors || undefined,
  });

  const jobId = submitRes.jobId || submitRes.id;
  if (!jobId) throw new Error('Content Writer did not return a job ID');

  // Poll for completion
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);

    const { data: status } = await client.get(`/api/job-status/${jobId}`);

    if (status.status === 'completed' || status.status === 'done') {
      const { data: result } = await client.get(`/api/job-result/${jobId}`);
      return { jobId, result };
    }

    if (status.status === 'failed' || status.status === 'error') {
      throw new Error(`Content Writer job failed: ${status.error || 'unknown error'}`);
    }
  }

  throw new Error(`Content Writer job ${jobId} timed out after ${POLL_TIMEOUT / 1000}s`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { generateRecipe };
