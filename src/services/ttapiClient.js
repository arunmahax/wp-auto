const axios = require('axios');

const BASE_URL = 'https://api.ttapi.io';
const POLL_INTERVAL = 10000;
const POLL_TIMEOUT = 300000; // 5 min — Midjourney can be slow

/**
 * Generate images via TTAPI Midjourney imagine endpoint.
 * Midjourney returns a grid of 4 images; after upscaling we get individual URLs.
 *
 * @param {Object} opts
 * @param {string} opts.apiKey - TTAPI TT-API-KEY
 * @param {string} opts.prompt - Image prompt
 * @returns {Promise<Object>} { jobId, imageUrl, imageUrls }
 */
async function imagine({ apiKey, prompt }) {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'TT-API-KEY': apiKey, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  console.log(`[TTAPI] Prompt (${prompt.length} chars):`, prompt.substring(0, 200));

  // Submit imagine request
  let submitRes;
  try {
    const res = await client.post('/midjourney/v1/imagine', { prompt });
    submitRes = res.data;
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`TTAPI imagine failed (${err.response?.status}): ${detail}`);
  }

  const jobId = submitRes.data?.jobId || submitRes.data?.taskId || submitRes.taskId || submitRes.jobId || submitRes.id;
  if (!jobId) throw new Error('TTAPI did not return a job ID');

  console.log(`[TTAPI] Imagine submitted: ${jobId}`);

  // Poll for the imagine grid result
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);

    let status;
    try {
      const res = await client.get('/midjourney/v1/fetch', {
        params: { jobId },
      });
      status = res.data;
    } catch (fetchErr) {
      console.error(`[TTAPI] Poll fetch error for ${jobId}:`, fetchErr.response?.data || fetchErr.message);
      // Continue polling on transient fetch errors
      continue;
    }

    const state = status.data?.status || status.status;
    const progress = status.data?.progress || '';
    console.log(`[TTAPI] Poll ${jobId}: ${state} ${progress}`);

    if (state === 'finished' || state === 'DONE' || state === 'SUCCESS') {
      console.log(`[TTAPI] Job finished. Response keys:`, JSON.stringify(Object.keys(status.data || status)));
      console.log(`[TTAPI] Full data:`, JSON.stringify(status.data || status, null, 2).substring(0, 1000));
      // Try to get individual image URLs
      const images = status.data?.images || status.data?.imageUrls || [];
      const gridUrl = status.data?.imageUrl || status.data?.discordImage || status.imageUrl;

      if (images.length >= 4) {
        return {
          jobId,
          imageUrl: images[0],
          imageUrls: images.slice(0, 4),
        };
      }

      // If only grid URL, we need to upscale individual images
      if (gridUrl) {
        console.log(`[TTAPI] Got grid image, upscaling 4 images...`);
        const upscaled = await upscaleAll(client, jobId);
        if (upscaled.length >= 3) {
          return {
            jobId,
            imageUrl: upscaled[0],
            imageUrls: upscaled,
          };
        }
        // Fallback: just use the grid URL for all
        return { jobId, imageUrl: gridUrl, imageUrls: [gridUrl] };
      }

      throw new Error('TTAPI finished but no image URL found');
    }

    if (state === 'failed' || state === 'FAIL' || state === 'FAILED') {
      // Log full response for debugging
      console.error(`[TTAPI] Job ${jobId} failed. Full status:`, JSON.stringify(status, null, 2));
      const errorMsg = status.data?.error 
        || status.data?.failReason 
        || status.data?.message
        || status.error
        || status.message
        || status.data?.errorMessage
        || (status.data ? JSON.stringify(status.data) : 'No error details returned');
      throw new Error(`TTAPI task failed: ${errorMsg}`);
    }

    // Handle other terminal states
    if (state === 'CANCELLED' || state === 'cancelled') {
      throw new Error('TTAPI task was cancelled');
    }
    if (state === 'BANNED' || state === 'banned') {
      throw new Error('TTAPI task was banned - check your prompt for prohibited content');
    }

    // Log unexpected states (not pending/running/processing)
    const expectedStates = ['pending', 'PENDING', 'running', 'RUNNING', 'processing', 'PROCESSING', 'submitted', 'SUBMITTED', 'waiting', 'WAITING'];
    if (state && !expectedStates.includes(state)) {
      console.warn(`[TTAPI] Unexpected state for ${jobId}: "${state}". Full status:`, JSON.stringify(status, null, 2));
    }
  }

  throw new Error(`TTAPI job ${jobId} timed out after ${POLL_TIMEOUT / 1000}s`);
}

/**
 * Upscale all 4 images from a Midjourney grid.
 */
async function upscaleAll(client, originJobId) {
  const upscaledUrls = [];

  for (let index = 1; index <= 4; index++) {
    try {
      const { data: upRes } = await client.post('/midjourney/v1/upscale', {
        originJobId,
        index: String(index),
      });

      const upJobId = upRes.data?.jobId || upRes.jobId;
      if (!upJobId) continue;

      console.log(`[TTAPI] Upscale U${index} submitted: ${upJobId}`);

      // Poll for upscale result
      const start = Date.now();
      while (Date.now() - start < 120000) {
        await sleep(5000);
        const { data: status } = await client.get('/midjourney/v1/fetch', {
          params: { jobId: upJobId },
        });
        const state = status.data?.status || status.status;
        if (state === 'finished' || state === 'DONE' || state === 'SUCCESS') {
          const url = status.data?.imageUrl || status.data?.discordImage;
          if (url) upscaledUrls.push(url);
          break;
        }
        if (state === 'failed' || state === 'FAIL' || state === 'FAILED') break;
      }
    } catch (err) {
      console.error(`[TTAPI] Upscale U${index} failed:`, err.message);
    }
  }

  return upscaledUrls;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { imagine };
