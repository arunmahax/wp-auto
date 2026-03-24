const axios = require('axios');

const BASE_URL = 'https://api.ttapi.io';
const POLL_INTERVAL = 10000;
const POLL_TIMEOUT = 300000; // 5 min — Midjourney can be slow

/**
 * Generate an image via TTAPI Midjourney imagine endpoint.
 *
 * @param {Object} opts
 * @param {string} opts.apiKey - TTAPI x-api-key
 * @param {string} opts.prompt - Image prompt
 * @returns {Promise<Object>} { taskId, imageUrl }
 */
async function imagine({ apiKey, prompt }) {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // Submit imagine request
  const { data: submitRes } = await client.post('/midjourney/v1/imagine', {
    prompt,
  });

  const taskId = submitRes.data?.taskId || submitRes.taskId || submitRes.id;
  if (!taskId) throw new Error('TTAPI did not return a task ID');

  // Poll for result
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);

    const { data: status } = await client.get(`/midjourney/v1/fetch`, {
      params: { taskId },
    });

    const state = status.data?.status || status.status;

    if (state === 'finished' || state === 'DONE') {
      const imageUrl = status.data?.imageUrl || status.data?.discordImage || status.imageUrl;
      if (!imageUrl) throw new Error('TTAPI finished but no image URL found');
      return { taskId, imageUrl };
    }

    if (state === 'failed' || state === 'FAIL') {
      throw new Error(`TTAPI task failed: ${status.data?.error || 'unknown'}`);
    }
  }

  throw new Error(`TTAPI task ${taskId} timed out after ${POLL_TIMEOUT / 1000}s`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { imagine };
