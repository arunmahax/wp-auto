/**
 * Pin Generator Service
 * Generates Pinterest pin images from templates
 * Uses @napi-rs/canvas for server-side image rendering (pre-built binaries, no compilation needed)
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Font directory
const FONTS_DIR = path.join(__dirname, '..', '..', 'fonts');

// Cache for loaded fonts
const loadedFonts = new Set();

/**
 * Load and register a Google Font
 */
async function loadGoogleFont(fontFamily, weight = '400') {
  const fontKey = `${fontFamily}-${weight}`;
  
  if (loadedFonts.has(fontKey)) {
    return;
  }
  
  try {
    // Ensure fonts directory exists
    await fs.mkdir(FONTS_DIR, { recursive: true });
    
    const fontPath = path.join(FONTS_DIR, `${fontFamily.replace(/\s+/g, '-')}-${weight}.ttf`);
    
    // Check if font already downloaded
    try {
      await fs.access(fontPath);
    } catch {
      // Download from Google Fonts
      const formattedFamily = fontFamily.replace(/\s+/g, '+');
      const cssUrl = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@${weight}&display=swap`;
      
      const cssResponse = await axios.get(cssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Extract font URL from CSS
      const fontUrlMatch = cssResponse.data.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
      if (fontUrlMatch) {
        const fontResponse = await axios.get(fontUrlMatch[1], { responseType: 'arraybuffer' });
        await fs.writeFile(fontPath, Buffer.from(fontResponse.data));
      } else {
        console.warn(`Could not extract font URL for ${fontFamily}`);
        return;
      }
    }
    
    // Register font with @napi-rs/canvas
    GlobalFonts.registerFromPath(fontPath, fontFamily);
    
    loadedFonts.add(fontKey);
    console.log(`Loaded font: ${fontKey}`);
  } catch (error) {
    console.error(`Failed to load font ${fontFamily}:`, error.message);
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to download image: ${url}`, error.message);
    return null;
  }
}

/**
 * Word wrap text to fit within maxWidth
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Draw text with optional outline and shadow
 */
function drawStyledText(ctx, text, x, y, options = {}) {
  const {
    align = 'center',
    outline = false,
    outlineColor = '#ffffff',
    outlineWidth = 3,
    shadow = false,
    shadowColor = 'rgba(0,0,0,0.5)',
    shadowBlur = 4,
    shadowOffsetX = 2,
    shadowOffsetY = 2
  } = options;
  
  ctx.textAlign = align;
  
  // Shadow layer
  if (shadow) {
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  
  // Outline layer
  if (outline) {
    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.restore();
  }
  
  // Main text
  ctx.fillText(text, x, y);
}

/**
 * Generate pin image from template and data
 * @param {Object} template - Template configuration
 * @param {Object} data - Pin data (title, images, website)
 * @returns {Buffer} - PNG image buffer
 */
async function generatePin(template, data) {
  const { title, images = [], website, subtitle } = data;
  const { width = 1000, height = 1500 } = template;
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Load required fonts
  await loadGoogleFont(template.title_font || 'Montserrat', '700');
  if (template.subtitle_enabled && template.subtitle_font) {
    await loadGoogleFont(template.subtitle_font, '400');
  }
  if (template.website_enabled && template.website_font) {
    await loadGoogleFont(template.website_font, '400');
  }
  
  // Draw background
  if (template.background_type === 'solid') {
    ctx.fillStyle = template.background_color || '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else if (template.background_type === 'gradient') {
    const gradientConfig = JSON.parse(template.background_gradient || '{"colors":["#ffffff","#f0f0f0"]}');
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradientConfig.colors.forEach((color, i) => {
      gradient.addColorStop(i / (gradientConfig.colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Default white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  
  // Load and draw images based on layout
  const loadedImages = [];
  for (const imgUrl of images.slice(0, 2)) {
    if (imgUrl) {
      const imgBuffer = await downloadImage(imgUrl);
      if (imgBuffer) {
        try {
          const img = await loadImage(imgBuffer);
          loadedImages.push(img);
        } catch (e) {
          console.error('Failed to load image:', e.message);
        }
      }
    }
  }
  
  // Draw images based on layout
  if (loadedImages.length > 0) {
    if (template.layout === 'text-bar' || template.layout === 'two-photo-stack') {
      // Two-photo layout
      const imageHeight = template.text_bar_enabled 
        ? (height - (template.text_bar_height || 200)) / 2 
        : height / 2;
      
      // Top image
      if (loadedImages[0]) {
        drawCoverImage(ctx, loadedImages[0], 0, 0, width, imageHeight);
      }
      
      // Bottom image
      const bottomY = template.text_bar_enabled 
        ? imageHeight + (template.text_bar_height || 200)
        : imageHeight;
      
      if (loadedImages[1] || loadedImages[0]) {
        const bottomImg = loadedImages[1] || loadedImages[0];
        drawCoverImage(ctx, bottomImg, 0, bottomY, width, height - bottomY);
      }
      
      // Image overlay
      if (template.image_overlay_enabled) {
        ctx.fillStyle = template.image_overlay_color || 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, width, imageHeight);
        ctx.fillRect(0, bottomY, width, height - bottomY);
      }
      
    } else if (template.layout === 'full-background') {
      // Single image full background
      drawCoverImage(ctx, loadedImages[0], 0, 0, width, height);
      
      // Overlay
      if (template.image_overlay_enabled) {
        ctx.fillStyle = template.image_overlay_color || 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, width, height);
      }
    }
  }
  
  // Draw text bar
  if (template.text_bar_enabled) {
    const barHeight = template.text_bar_height || 200;
    let barY;
    
    switch (template.text_bar_position) {
      case 'top':
        barY = 0;
        break;
      case 'bottom':
        barY = height - barHeight;
        break;
      default: // center
        barY = (height - barHeight) / 2;
    }
    
    // Bar background
    ctx.fillStyle = template.text_bar_color || '#ffffff';
    ctx.globalAlpha = template.text_bar_opacity || 1;
    ctx.fillRect(0, barY, width, barHeight);
    ctx.globalAlpha = 1;
    
    // Draw title in text bar
    const titleY = barY + barHeight / 2;
    drawTitle(ctx, title, width / 2, titleY, template, width * 0.9);
    
    // Draw subtitle
    if (template.subtitle_enabled && (subtitle || template.subtitle_text)) {
      const subtitleText = subtitle || template.subtitle_text;
      ctx.fillStyle = template.subtitle_color || '#666666';
      ctx.font = `${template.subtitle_size || 32}px "${template.subtitle_font || 'Montserrat'}"`;
      ctx.textAlign = 'center';
      ctx.fillText(subtitleText, width / 2, titleY + (template.title_size || 72) * 0.8);
    }
    
  } else {
    // Overlay text on image
    const titleY = height / 2;
    drawTitle(ctx, title, width / 2, titleY, template, width * 0.9);
  }
  
  // Draw website
  if (template.website_enabled && website) {
    ctx.fillStyle = template.website_color || '#000000';
    ctx.font = `${template.website_size || 36}px "${template.website_font || 'Montserrat'}"`;
    ctx.textAlign = 'center';
    
    const websiteY = template.website_position === 'top' ? 50 : height - 30;
    
    // Website background bar
    if (template.website_background) {
      const textWidth = ctx.measureText(website).width;
      ctx.fillStyle = template.website_background;
      ctx.fillRect((width - textWidth) / 2 - 20, websiteY - 30, textWidth + 40, 50);
      ctx.fillStyle = template.website_color || '#000000';
    }
    
    ctx.fillText(website, width / 2, websiteY);
  }
  
  // Draw badges (for badge-style layout)
  if (template.badges_enabled && template.badges_config) {
    const badges = JSON.parse(template.badges_config);
    for (const badge of badges) {
      drawBadge(ctx, badge, width, height);
    }
  }
  
  // Return PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Draw image with cover-fit positioning
 */
function drawCoverImage(ctx, img, x, y, targetWidth, targetHeight) {
  const imgRatio = img.width / img.height;
  const targetRatio = targetWidth / targetHeight;
  
  let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
  
  if (imgRatio > targetRatio) {
    // Image is wider - crop sides
    srcWidth = img.height * targetRatio;
    srcX = (img.width - srcWidth) / 2;
  } else {
    // Image is taller - crop top/bottom
    srcHeight = img.width / targetRatio;
    srcY = (img.height - srcHeight) / 2;
  }
  
  ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, x, y, targetWidth, targetHeight);
}

/**
 * Draw title with styling
 */
function drawTitle(ctx, title, x, y, template, maxWidth) {
  const fontSize = template.title_size || 72;
  const fontFamily = template.title_font || 'Montserrat';
  
  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = template.title_color || '#000000';
  
  // Word wrap
  const lines = wrapText(ctx, title.toUpperCase(), maxWidth);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;
  
  // Limit to max lines
  const maxLines = template.title_max_lines || 3;
  const displayLines = lines.slice(0, maxLines);
  
  displayLines.forEach((line, i) => {
    drawStyledText(ctx, line, x, startY + i * lineHeight, {
      align: template.title_alignment || 'center',
      outline: template.title_outline_enabled,
      outlineColor: template.title_outline_color || '#ffffff',
      outlineWidth: template.title_outline_width || 3,
      shadow: template.title_shadow_enabled,
      shadowColor: template.title_shadow_color || 'rgba(0,0,0,0.5)',
      shadowBlur: template.title_shadow_blur || 4
    });
  });
}

/**
 * Draw badge element
 */
function drawBadge(ctx, badge, canvasWidth, canvasHeight) {
  const {
    text,
    position = 'top-left',
    backgroundColor = '#E60023',
    textColor = '#ffffff',
    fontSize = 24,
    padding = 15,
    borderRadius = 8
  } = badge;
  
  ctx.font = `bold ${fontSize}px "Montserrat"`;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;
  
  // Position
  let x, y;
  switch (position) {
    case 'top-left':
      x = 20; y = 20;
      break;
    case 'top-right':
      x = canvasWidth - boxWidth - 20; y = 20;
      break;
    case 'bottom-left':
      x = 20; y = canvasHeight - boxHeight - 20;
      break;
    case 'bottom-right':
      x = canvasWidth - boxWidth - 20; y = canvasHeight - boxHeight - 20;
      break;
    default:
      x = 20; y = 20;
  }
  
  // Draw rounded rectangle
  ctx.fillStyle = backgroundColor;
  roundRect(ctx, x, y, boxWidth, boxHeight, borderRadius);
  ctx.fill();
  
  // Draw text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + boxWidth / 2, y + boxHeight / 2 + fontSize / 3);
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generate preview image for template editor
 */
async function generatePreview(template) {
  const previewData = {
    title: 'Sample Recipe Title Here',
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'
    ],
    website: 'www.example.com',
    subtitle: template.subtitle_text || 'EASY | DELICIOUS | THE BEST'
  };
  
  return generatePin(template, previewData);
}

module.exports = {
  generatePin,
  generatePreview,
  loadGoogleFont
};
