const Joi = require('joi');

// Schema for creating a new aspirasi (feedback/suggestion)
const createAspirasiSchema = Joi.object({
  sender_id: Joi.string().uuid().allow(null).optional().messages({
    'string.guid': 'Sender ID must be a valid UUID'
  }),
  target: Joi.string().required().min(2).max(100).trim().messages({
    'string.empty': 'Target is required',
    'string.min': 'Target must be at least 2 characters long',
    'string.max': 'Target must be less than 100 characters',
    'any.required': 'Target is required'
  }),
  subject: Joi.string().required().min(3).max(255).trim().messages({
    'string.empty': 'Subject is required',
    'string.min': 'Subject must be at least 3 characters long',
    'string.max': 'Subject must be less than 255 characters',
    'any.required': 'Subject is required'
  }),
  message: Joi.string().required().min(10).trim().messages({
    'string.empty': 'Message is required',
    'string.min': 'Message must be at least 10 characters long',
    'any.required': 'Message is required'
  }),
  anonymous: Joi.boolean().default(false).messages({
    'boolean.base': 'Anonymous field must be a boolean'
  })
});

// Schema for deleting an aspirasi
const deleteAspirasiSchema = Joi.object({
  aspirasi_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Aspirasi ID must be a number',
    'number.positive': 'Aspirasi ID must be positive',
    'any.required': 'Aspirasi ID is required'
  })
});

// Schema for getting aspirasi by target
const getAspirasiByTargetSchema = Joi.object({
  target: Joi.string().required().min(2).max(100).trim().messages({
    'string.empty': 'Target is required',
    'string.min': 'Target must be at least 2 characters long',
    'string.max': 'Target must be less than 100 characters',
    'any.required': 'Target is required'
  })
});

module.exports = {
  createAspirasiSchema,
  deleteAspirasiSchema,
  getAspirasiByTargetSchema
};