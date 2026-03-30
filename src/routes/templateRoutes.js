const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get available fonts
router.get('/fonts', templateController.getFonts);

// Get layout presets
router.get('/layouts', templateController.getLayouts);

// Generate preview image (POST with template config in body)
router.post('/preview', templateController.generatePreview);

// Generate actual pin image
router.post('/generate', templateController.generatePin);

// Get all templates
router.get('/', templateController.getTemplates);

// Get single template
router.get('/:id', templateController.getTemplate);

// Create new template
router.post('/', templateController.createTemplate);

// Update template
router.put('/:id', templateController.updateTemplate);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

// Duplicate template
router.post('/:id/duplicate', templateController.duplicateTemplate);

module.exports = router;
