/**
 * RSS Spy Service
 * Fetches competitor recipes from RSS feeds and extracts title + featured image
 */

const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

/**
 * Extract featured image from RSS item
 * Different feeds use different structures
 */
function extractImage(item) {
  // 1. Check media:content (most food blogs)
  if (item.mediaContent && item.mediaContent.length > 0) {
    const media = item.mediaContent[0];
    if (media.$ && media.$.url) return media.$.url;
    if (typeof media === 'string') return media;
  }

  // 2. Check media:thumbnail
  if (item.mediaThumbnail) {
    if (item.mediaThumbnail.$ && item.mediaThumbnail.$.url) return item.mediaThumbnail.$.url;
    if (typeof item.mediaThumbnail === 'string') return item.mediaThumbnail;
  }

  // 3. Check enclosure (podcast-style feeds)
  if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }

  // 4. Parse from content:encoded or content
  const content = item.contentEncoded || item.content || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  // 5. Parse from description
  if (item.description) {
    const descMatch = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
      return descMatch[1];
    }
  }

  return null;
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Check if title matches any keywords (case-insensitive)
 */
function matchesKeywords(title, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const lowerTitle = title.toLowerCase();
  return keywords.some(kw => lowerTitle.includes(kw.toLowerCase()));
}

/**
 * Fetch and parse a single RSS feed
 */
async function fetchFeed(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const domain = getDomain(feedUrl);
    
    const items = feed.items.map(item => ({
      title: item.title?.trim() || 'Untitled',
      link: item.link,
      image: extractImage(item),
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      domain: domain || getDomain(item.link) || 'unknown',
      feedTitle: feed.title,
    })).filter(item => item.title); // Keep all items with titles (image optional)

    return { success: true, items, feedUrl };
  } catch (error) {
    console.error(`[RSS Spy] Failed to fetch ${feedUrl}:`, error.message);
    return { success: false, items: [], feedUrl, error: error.message };
  }
}

/**
 * Fetch all feeds for a project and return deduplicated items
 * @param {Array<string>} feedUrls - List of RSS feed URLs
 * @param {Array<string>} existingTitles - Titles already in the project (for dedup)
 * @param {Array<string>} keywords - Optional filter keywords
 * @returns {Array} Spy items
 */
async function fetchAllFeeds(feedUrls, existingTitles = [], keywords = []) {
  if (!feedUrls || feedUrls.length === 0) {
    return { items: [], errors: [], stats: null };
  }

  // Normalize existing titles for comparison
  const normalizedExisting = new Set(
    existingTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  // Fetch all feeds in parallel
  const results = await Promise.all(feedUrls.map(url => fetchFeed(url)));

  const allItems = [];
  const errors = [];
  const seenTitles = new Set();
  
  // Stats for debugging
  let totalFromFeeds = 0;
  let skippedNoImage = 0;
  let skippedDuplicate = 0;
  let skippedExisting = 0;
  let skippedKeyword = 0;

  for (const result of results) {
    if (!result.success) {
      errors.push({ feedUrl: result.feedUrl, error: result.error });
      continue;
    }

    totalFromFeeds += result.items.length;

    for (const item of result.items) {
      // Normalize title for dedup
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Skip duplicates within this fetch
      if (seenTitles.has(normalizedTitle)) {
        skippedDuplicate++;
        continue;
      }

      // Skip if already exists in project recipes
      if (normalizedExisting.has(normalizedTitle)) {
        skippedExisting++;
        continue;
      }

      // Skip if doesn't match keywords
      if (!matchesKeywords(item.title, keywords)) {
        skippedKeyword++;
        continue;
      }

      seenTitles.add(normalizedTitle);
      allItems.push(item);
    }
  }

  // Sort by publish date (newest first)
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  const stats = {
    totalFromFeeds,
    skippedDuplicate,
    skippedExisting,
    skippedKeyword,
    feedsSucceeded: results.filter(r => r.success).length,
    feedsFailed: errors.length,
  };

  return { items: allItems, errors, stats };
}

/**
 * Popular recipe RSS feeds - suggestions for users
 */
const SUGGESTED_FEEDS = [
  { url: 'https://pinchofyum.com/feed', name: 'Pinch of Yum', category: 'All' },
  { url: 'https://www.halfbakedharvest.com/feed/', name: 'Half Baked Harvest', category: 'All' },
  { url: 'https://www.budgetbytes.com/feed/', name: 'Budget Bytes', category: 'Budget' },
  { url: 'https://damndelicious.net/feed/', name: 'Damn Delicious', category: 'Quick' },
  { url: 'https://www.gimmesomeoven.com/feed/', name: 'Gimme Some Oven', category: 'All' },
  { url: 'https://minimalistbaker.com/feed/', name: 'Minimalist Baker', category: 'Vegan' },
  { url: 'https://sallysbakingaddiction.com/feed/', name: "Sally's Baking Addiction", category: 'Baking' },
  { url: 'https://www.skinnytaste.com/feed/', name: 'Skinnytaste', category: 'Healthy' },
  { url: 'https://www.loveandlemons.com/feed/', name: 'Love and Lemons', category: 'Vegetarian' },
  { url: 'https://cookieandkate.com/feed/', name: 'Cookie and Kate', category: 'Vegetarian' },
  { url: 'https://www.recipetineats.com/feed/', name: 'RecipeTin Eats', category: 'All' },
  { url: 'https://www.seriouseats.com/feeds/serious-eats', name: 'Serious Eats', category: 'All' },
  { url: 'https://www.howsweeteats.com/feed/', name: 'How Sweet Eats', category: 'All' },
  { url: 'https://smittenkitchen.com/feed/', name: 'Smitten Kitchen', category: 'All' },
  { url: 'https://www.twopeasandtheirpod.com/feed/', name: 'Two Peas and Their Pod', category: 'Family' },
];

module.exports = {
  fetchFeed,
  fetchAllFeeds,
  extractImage,
  getDomain,
  SUGGESTED_FEEDS,
};
