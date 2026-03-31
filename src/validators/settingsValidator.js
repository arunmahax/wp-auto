const Joi = require('joi');

const upsertSettingsSchema = Joi.object({
  ttapi_api_key: Joi.string().allow('', null),
  content_api_url: Joi.string().uri().allow('', null),
  content_api_key: Joi.string().allow('', null),
  pin_generator_url: Joi.string().uri().allow('', null),
  pin_generator_key: Joi.string().allow('', null),
  openai_api_key: Joi.string().allow('', null),
}).min(1).messages({
  'object.min': 'At least one field must be provided',
});

module.exports = { upsertSettingsSchema };
