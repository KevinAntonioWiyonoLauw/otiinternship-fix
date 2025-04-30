const Joi = require('joi');

const reminderEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  }),
  meeting_id: Joi.number().integer().required().messages({
    'number.base': 'Meeting ID must be a number',
    'any.required': 'Meeting ID is required'
  }),
  meeting_title: Joi.string().required().messages({
    'string.empty': 'Meeting title is required',
    'any.required': 'Meeting title is required'
  }),
  meeting_date: Joi.string().required().messages({
    'string.empty': 'Meeting date is required',
    'any.required': 'Meeting date is required'
  }),
  meeting_time: Joi.string().required().messages({
    'string.empty': 'Meeting time is required',
    'any.required': 'Meeting time is required'
  }),
  meeting_location: Joi.string().required().messages({
    'string.empty': 'Meeting location is required',
    'any.required': 'Meeting location is required'
  }),
  join_code: Joi.string().required().messages({
    'string.empty': 'Join code is required',
    'any.required': 'Join code is required'
  })
});

module.exports = reminderEmailSchema;