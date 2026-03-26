const { Router } = require('express');
const axios = require('axios');

const router = Router();

// No auth required - URL pattern validation + rate limiting provides protection

/**
 * GET /api/image-proxy?url=<encoded-url>
 * Proxies external images through our server to bypass Cloudflare hotlink protection.
 * Allows WordPress media URLs from any domain + known image CDNs.
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

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Allow WordPress media from ANY domain (auto-works for all user projects)
  const isWordPressMedia = parsedUrl.pathname.includes('/wp-content/uploads/');
  
  // Also allow known image CDNs
  const trustedCDNs = ['cdn.ttapi.io', 'pindesigner.productugc.com', 'i.ibb.co'];
  const isTrustedCDN = trustedCDNs.some(cdn => 
    parsedUrl.hostname === cdn || parsedUrl.hostname.endsWith('.' + cdn)
  );

  // Must be image file extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExt = imageExtensions.some(ext => 
    parsedUrl.pathname.toLowerCase().endsWith(ext)
  );

  if (!isWordPressMedia && !isTrustedCDN) {
    return res.status(403).json({ error: 'Only WordPress media and trusted CDNs allowed' });
  }

  if (!hasImageExt && !isTrustedCDN) {
    return res.status(403).json({ error: 'Only image files allowed' });
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
