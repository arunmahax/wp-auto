const { Router } = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = Router();

// Require auth to prevent abuse
router.use(auth);

/**
 * GET /api/image-proxy?url=<encoded-url>
 * Proxies external images through our server to bypass Cloudflare hotlink protection.
 * Only allows images from trusted domains.
 */
router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  // Decode the URL
  let imageUrl;
  try {
    imageUrl = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  // Whitelist trusted domains
  const trustedDomains = [
    'recipecia.com',
    'cdn.ttapi.io',
    'pindesigner.productugc.com',
    'i.ibb.co',
  ];

  let hostname;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const isTrusted = trustedDomains.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (!isTrusted) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    // Set caching headers (1 hour)
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });

    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    // Stream the image
    response.data.pipe(res);
  } catch (err) {
    console.error('[ImageProxy] Failed to fetch:', imageUrl, err.message);
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;
