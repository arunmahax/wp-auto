const Joi = require('joi');

const createJobSchema = Joi.object({
  type: Joi.string().min(1).max(50).required().messages({
    'any.required': 'Job type is required',
    'string.min': 'Job type is required',
  }),
  description: Joi.string().max(2000).allow('', null),
});

module.exports = { createJobSchema };
