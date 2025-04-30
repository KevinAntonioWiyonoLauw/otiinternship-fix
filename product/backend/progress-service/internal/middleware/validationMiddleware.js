const Joi = require('joi');
const { AppError } = require('../Exceptions/errorHandler');
const logger = require('../logger');

// Validation schemas
const schemas = {
  createParticipation: Joi.object({
    eventType: Joi.string().valid('COMMITTEE', 'TASK').required().messages({
      'any.only': 'Event type must be either COMMITTEE or TASK',
      'any.required': 'Event type is required'
    }),
    details: Joi.string().min(5).max(500).messages({
      'string.min': 'Details must be at least 5 characters',
      'string.max': 'Details must be less than 500 characters'
    })
  }),
  
  updateStatus: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID must be a number',
      'number.integer': 'ID must be an integer',
      'number.positive': 'ID must be positive',
      'any.required': 'ID is required'
    })
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      logger.warn(`Validation error: ${error.message}`);
      return next(new AppError(error.message, 400, error.details));
    }
    
    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  schemas
};