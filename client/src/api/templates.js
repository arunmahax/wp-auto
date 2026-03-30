import client from './client';

/**
 * Template API Service
 */

// Get all templates
export const getTemplates = async () => {
  const response = await client.get('/templates');
  return response.data;
};

// Get single template
export const getTemplate = async (id) => {
  const response = await client.get(`/templates/${id}`);
  return response.data;
};

// Create new template
export const createTemplate = async (templateData) => {
  const response = await client.post('/templates', templateData);
  return response.data;
};

// Update template
export const updateTemplate = async (id, templateData) => {
  const response = await client.put(`/templates/${id}`, templateData);
  return response.data;
};

// Delete template
export const deleteTemplate = async (id) => {
  const response = await client.delete(`/templates/${id}`);
  return response.data;
};

// Duplicate template
export const duplicateTemplate = async (id) => {
  const response = await client.post(`/templates/${id}/duplicate`);
  return response.data;
};

// Get available fonts
export const getFonts = async () => {
  const response = await client.get('/templates/fonts');
  return response.data;
};

// Get layout presets
export const getLayouts = async () => {
  const response = await client.get('/templates/layouts');
  return response.data;
};

// Generate preview image (returns blob URL)
export const generatePreview = async (templateConfig, previewData = {}) => {
  const response = await client.post('/templates/preview', {
    ...templateConfig,
    ...previewData
  }, {
    responseType: 'blob'
  });
  return URL.createObjectURL(response.data);
};

// Generate pin image
export const generatePin = async (templateId, pinData, format = 'base64') => {
  const response = await client.post(`/templates/generate?format=${format}`, {
    template_id: templateId,
    ...pinData
  });
  return response.data;
};

export default {
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
