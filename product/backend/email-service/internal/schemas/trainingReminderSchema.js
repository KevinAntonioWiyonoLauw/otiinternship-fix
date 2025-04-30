const Joi = require('joi');

const trainingReminderSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  }),
  training_id: Joi.number().integer().required().messages({
    'number.base': 'Training ID must be a number',
    'any.required': 'Training ID is required'
  }),
  training_title: Joi.string().required().messages({
    'string.empty': 'Training title is required',
    'any.required': 'Training title is required'
  }),
  training_date: Joi.string().required().messages({
    'string.empty': 'Training date is required',
    'any.required': 'Training date is required'
  }),
  training_time: Joi.string().required().messages({
    'string.empty': 'Training time is required',
    'any.required': 'Training time is required'
  }),
  training_location: Joi.string().required().messages({
    'string.empty': 'Training location is required',
    'any.required': 'Training location is required'
  }),
  division_id: Joi.number().optional(),
  is_today: Joi.boolean().optional(),
  is_tomorrow: Joi.boolean().optional()
});

module.exports = trainingReminderSchema;