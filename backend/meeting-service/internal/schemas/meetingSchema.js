const Joi = require('joi');

const createMeetingSchema = Joi.object({
  title: Joi.string().required().min(3).max(255).trim().messages({
    'string.empty': 'Meeting title is required',
    'string.min': 'Meeting title must be at least 3 characters long',
    'string.max': 'Meeting title must be less than 255 characters'
  }),
  date: Joi.date()
    .iso()
    .custom((value, helpers) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (value < today) {
        return helpers.error('date.min', { limit: today.toISOString() });
      }
      return value;
    })
    .required()
    .messages({
      'date.base': 'Meeting date must be a valid date',
      'date.format': 'Format date must be ISO 8601 (YYYY-MM-DD)',
      'date.min': 'Meeting date cannot be in the past',
      'any.required': 'Meeting date is required'
    }),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Start time must be in valid format (HH:MM)',
    'any.required': 'Start time is required'
  }),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'End time must be in valid format (HH:MM)',
    'any.required': 'End time is required'
  }),
  location: Joi.string().required().min(3).max(255).trim().messages({
    'string.empty': 'Meeting location is required',
    'string.min': 'Meeting location must be at least 3 characters long',
    'string.max': 'Meeting location must be less than 255 characters'
  })
}).custom((value, helpers) => {
  // Validate that end_time is after start_time
  const startTime = value.start_time.split(':');
  const endTime = value.end_time.split(':');
  
  const startHour = parseInt(startTime[0]);
  const startMinute = parseInt(startTime[1]);
  const endHour = parseInt(endTime[0]);
  const endMinute = parseInt(endTime[1]);
  
  if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
    return helpers.error('custom.invalidTimeRange', { message: 'End time must be after start time' });
  }
  
  return value;
}, 'validate time range');

const joinMeetingSchema = Joi.object({
  join_code: Joi.string().required().min(6).max(50).trim().messages({
    'string.empty': 'Join code is required',
    'string.min': 'Join code must be at least 6 characters long',
    'string.max': 'Join code must be less than 50 characters'
  })
});

const checkConflictSchema = Joi.object({
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Date must be a valid date',
      'date.format': 'Format date must be ISO 8601 (YYYY-MM-DD)',
      'any.required': 'Date is required'
    }),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Start time must be in valid format (HH:MM)',
    'any.required': 'Start time is required'
  }),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'End time must be in valid format (HH:MM)',
    'any.required': 'End time is required'
  })
}).custom((value, helpers) => {
  // Validate that end_time is after start_time
  const startTime = value.start_time.split(':');
  const endTime = value.end_time.split(':');
  
  const startHour = parseInt(startTime[0]);
  const startMinute = parseInt(startTime[1]);
  const endHour = parseInt(endTime[0]);
  const endMinute = parseInt(endTime[1]);
  
  if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
    return helpers.error('custom.invalidTimeRange', { message: 'End time must be after start time' });
  }
  
  return value;
}, 'validate time range');

module.exports = {
  createMeetingSchema,
  joinMeetingSchema,
  checkConflictSchema
};