const Joi = require('joi');

// Schema for creating a new participation entry
const createParticipationSchema = Joi.object({
  event_type: Joi.string().valid('kepanitiaan', 'tugas').required().messages({
    'string.empty': 'Event type is required',
    'any.only': 'Event type must be either "kepanitiaan" or "tugas"',
    'any.required': 'Event type is required'
  }),
  details: Joi.string().min(5).max(1000).required().messages({
    'string.empty': 'Details are required',
    'string.min': 'Details must be at least 5 characters long',
    'string.max': 'Details must be less than 1000 characters',
    'any.required': 'Details are required'
  })
});

// Schema for updating participation status (for Kadiv HD)
const updateParticipationStatusSchema = Joi.object({
  participation_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Participation ID must be a number',
    'number.positive': 'Participation ID must be positive',
    'any.required': 'Participation ID is required'
  }),
  status: Joi.string().valid('accepted', 'rejected', 'pending').required().messages({
    'string.empty': 'Status is required',
    'any.only': 'Status must be one of: accepted, rejected, pending',
    'any.required': 'Status is required'
  })
});

// Schema for fetching progress by user ID
const getProgressByUserSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  })
});

module.exports = {
  createParticipationSchema,
  updateParticipationStatusSchema,
  getProgressByUserSchema
};