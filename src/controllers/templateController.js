const { Template, User } = require('../models');
const { Op } = require('sequelize');

// Lazy-load pin generator to avoid startup issues if canvas not installed
let pinGenerator = null;
const getPinGenerator = () => {
  if (!pinGenerator) {
    try {
      pinGenerator = require('../services/pinGeneratorService');
    } catch (error) {
      console.error('Pin generator not available:', error.message);
    }
  }
  return pinGenerator;
};

/**
 * Template Controller
 * Handles CRUD operations for Pinterest pin templates
 */

// Get all templates for current user (including system templates)
const getTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const templates = await Template.findAll({
      where: {
        [Op.or]: [
          { user_id: userId },
          { is_system: true }
        ],
        is_active: true
      },
      order: [
        ['is_system', 'DESC'],
        ['created_at', 'DESC']
      ]
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Get single template by ID
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const template = await Template.findOne({
      where: {
        id,
        [Op.or]: [
          { user_id: userId },
          { is_system: true }
        ]
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

// Create new template
const createTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const templateData = {
      ...req.body,
      user_id: userId,
      is_system: false // Only admins can create system templates
    };
    
    const template = await Template.create(templateData);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const template = await Template.findOne({
      where: { id, user_id: userId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found or access denied' });
    }
    
    // Remove fields that shouldn't be updated
    const { user_id, is_system, ...updateData } = req.body;
    
    await template.update(updateData);
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const template = await Template.findOne({
      where: { id, user_id: userId, is_system: false }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found or cannot be deleted' });
    }
    
    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

// Duplicate template
const duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const original = await Template.findOne({
      where: {
        id,
        [Op.or]: [
          { user_id: userId },
          { is_system: true }
        ]
      }
    });
    
    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Create copy
    const templateData = original.toJSON();
    delete templateData.id;
    delete templateData.created_at;
    delete templateData.updated_at;
    templateData.user_id = userId;
    templateData.is_system = false;
    templateData.name = `${original.name} (Copy)`;
    
    const newTemplate = await Template.create(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
};

// Get available fonts list
const getFonts = async (req, res) => {
  try {
    // Popular Google Fonts for Pinterest designs
    const fonts = [
      // Sans-Serif - Clean & Modern
      { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif', weights: ['400', '500', '600', '700', '800', '900'] },
      { name: 'Poppins', family: 'Poppins', category: 'sans-serif', weights: ['400', '500', '600', '700', '800', '900'] },
      { name: 'Roboto', family: 'Roboto', category: 'sans-serif', weights: ['400', '500', '700', '900'] },
      { name: 'Open Sans', family: 'Open Sans', category: 'sans-serif', weights: ['400', '600', '700', '800'] },
      { name: 'Lato', family: 'Lato', category: 'sans-serif', weights: ['400', '700', '900'] },
      { name: 'Raleway', family: 'Raleway', category: 'sans-serif', weights: ['400', '500', '600', '700', '800'] },
      { name: 'Nunito', family: 'Nunito', category: 'sans-serif', weights: ['400', '600', '700', '800'] },
      { name: 'Work Sans', family: 'Work Sans', category: 'sans-serif', weights: ['400', '500', '600', '700', '800'] },
      { name: 'Oswald', family: 'Oswald', category: 'sans-serif', weights: ['400', '500', '600', '700'] },
      { name: 'Inter', family: 'Inter', category: 'sans-serif', weights: ['400', '500', '600', '700', '800', '900'] },
      { name: 'Bebas Neue', family: 'Bebas Neue', category: 'sans-serif', weights: ['400'] },
      { name: 'Anton', family: 'Anton', category: 'sans-serif', weights: ['400'] },
      { name: 'Archivo Black', family: 'Archivo Black', category: 'sans-serif', weights: ['400'] },
      { name: 'Barlow Condensed', family: 'Barlow Condensed', category: 'sans-serif', weights: ['400', '500', '600', '700', '800'] },
      
      // Serif - Elegant
      { name: 'Playfair Display', family: 'Playfair Display', category: 'serif', weights: ['400', '500', '600', '700', '800', '900'] },
      { name: 'Merriweather', family: 'Merriweather', category: 'serif', weights: ['400', '700', '900'] },
      { name: 'Lora', family: 'Lora', category: 'serif', weights: ['400', '500', '600', '700'] },
      { name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif', weights: ['400', '500', '600', '700'] },
      { name: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', weights: ['400', '700'] },
      
      // Script/Handwriting - Decorative
      { name: 'Pacifico', family: 'Pacifico', category: 'handwriting', weights: ['400'] },
      { name: 'Dancing Script', family: 'Dancing Script', category: 'handwriting', weights: ['400', '500', '600', '700'] },
      { name: 'Satisfy', family: 'Satisfy', category: 'handwriting', weights: ['400'] },
      { name: 'Great Vibes', family: 'Great Vibes', category: 'handwriting', weights: ['400'] },
      { name: 'Lobster', family: 'Lobster', category: 'handwriting', weights: ['400'] },
      { name: 'Courgette', family: 'Courgette', category: 'handwriting', weights: ['400'] },
      { name: 'Kaushan Script', family: 'Kaushan Script', category: 'handwriting', weights: ['400'] },
      { name: 'Permanent Marker', family: 'Permanent Marker', category: 'handwriting', weights: ['400'] },
      { name: 'Sacramento', family: 'Sacramento', category: 'handwriting', weights: ['400'] },
      { name: 'Amatic SC', family: 'Amatic SC', category: 'handwriting', weights: ['400', '700'] },
      { name: 'Caveat', family: 'Caveat', category: 'handwriting', weights: ['400', '500', '600', '700'] },
      { name: 'Cookie', family: 'Cookie', category: 'handwriting', weights: ['400'] },
      
      // Display - Bold & Attention-grabbing
      { name: 'Bangers', family: 'Bangers', category: 'display', weights: ['400'] },
      { name: 'Fredoka One', family: 'Fredoka One', category: 'display', weights: ['400'] },
      { name: 'Righteous', family: 'Righteous', category: 'display', weights: ['400'] },
      { name: 'Comfortaa', family: 'Comfortaa', category: 'display', weights: ['400', '500', '600', '700'] },
      { name: 'Titan One', family: 'Titan One', category: 'display', weights: ['400'] },
      { name: 'Bungee', family: 'Bungee', category: 'display', weights: ['400'] },
      { name: 'Chewy', family: 'Chewy', category: 'display', weights: ['400'] },
      { name: 'Lilita One', family: 'Lilita One', category: 'display', weights: ['400'] },
    ];
    
    res.json(fonts);
  } catch (error) {
    console.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Failed to fetch fonts' });
  }
};

// Get preset layouts
const getLayouts = async (req, res) => {
  try {
    const layouts = [
      {
        id: 'text-bar',
        name: 'Text Bar',
        description: 'Two photos with a text bar in the middle',
        preview: '/layouts/text-bar.svg',
        settings: {
          text_bar_enabled: true,
          text_bar_position: 'center',
          badges_enabled: false
        }
      },
      {
        id: 'two-photo-stack',
        name: 'Two Photo Stack',
        description: 'Photos stacked with overlay text',
        preview: '/layouts/two-photo-stack.svg',
        settings: {
          text_bar_enabled: false,
          title_outline_enabled: true,
          title_shadow_enabled: true
        }
      },
      {
        id: 'badge-style',
        name: 'Badge Style',
        description: 'Corner badges with center banner',
        preview: '/layouts/badge-style.svg',
        settings: {
          badges_enabled: true,
          text_bar_enabled: true,
          decorations_enabled: true
        }
      },
      {
        id: 'full-background',
        name: 'Full Background',
        description: 'Single image with overlay text',
        preview: '/layouts/full-background.svg',
        settings: {
          text_bar_enabled: false,
          image_overlay_enabled: true,
          title_outline_enabled: true
        }
      },
      {
        id: 'minimal',
        name: 'Minimal Clean',
        description: 'Clean white background with centered text',
        preview: '/layouts/minimal.svg',
        settings: {
          background_type: 'solid',
          background_color: '#ffffff',
          text_bar_enabled: false
        }
      }
    ];
    
    res.json(layouts);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
};

// Generate preview image for a template
const generatePreview = async (req, res) => {
  try {
    const generator = getPinGenerator();
    if (!generator) {
      return res.status(503).json({ 
        error: 'Pin generator not available. Please install canvas: npm install canvas' 
      });
    }
    
    const templateConfig = req.body;
    
    // Use sample data for preview
    const previewData = {
      title: req.body.preview_title || 'Delicious Recipe Title',
      images: req.body.preview_images || [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'
      ],
      website: req.body.preview_website || 'www.example.com',
      subtitle: templateConfig.subtitle_text
    };
    
    const imageBuffer = await generator.generatePin(templateConfig, previewData);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'no-cache'
    });
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
  }
};

// Generate actual pin image
const generatePin = async (req, res) => {
  try {
    const generator = getPinGenerator();
    if (!generator) {
      return res.status(503).json({ 
        error: 'Pin generator not available' 
      });
    }
    
    const { template_id, title, images, website, subtitle } = req.body;
    
    // Get template
    const template = await Template.findByPk(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const pinData = { title, images, website, subtitle };
    const imageBuffer = await generator.generatePin(template, pinData);
    
    // Return as base64 or buffer
    if (req.query.format === 'base64') {
      res.json({ 
        image: `data:image/png;base64,${imageBuffer.toString('base64')}` 
      });
    } else {
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      res.send(imageBuffer);
    }
  } catch (error) {
    console.error('Error generating pin:', error);
    res.status(500).json({ error: 'Failed to generate pin: ' + error.message });
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  getFonts,
  getLayouts,
  generatePreview,
  generatePin
};
