const Joi = require('joi');

const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Project name is required',
    'any.required': 'Project name is required',
  }),
  wp_api_url: Joi.string().uri().required().messages({
    'string.uri': 'WordPress API URL must be a valid URL',
    'any.required': 'WordPress API URL is required',
  }),
  wp_username: Joi.string().min(1).max(255).required().messages({
    'any.required': 'WordPress username is required',
  }),
  wp_app_password: Joi.string().min(1).required().messages({
    'any.required': 'WordPress app password is required',
  }),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  wp_api_url: Joi.string().uri(),
  wp_username: Joi.string().min(1).max(255),
  wp_app_password: Joi.string().min(1),
  google_sheet_url: Joi.string().uri().allow('', null),
  trigger_interval: Joi.string().valid('3h', '5h', '6h', '8h', '12h', 'disabled'),
  trigger_enabled: Joi.boolean(),
  content_categories: Joi.string().allow('', null),
  content_authors: Joi.string().allow('', null),
  image_prompt_template: Joi.string().allow('', null).max(1000),
  pin_design_config: Joi.string().allow('', null).max(5000),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

module.exports = { createProjectSchema, updateProjectSchema };
