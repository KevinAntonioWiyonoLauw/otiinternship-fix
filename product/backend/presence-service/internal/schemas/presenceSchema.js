const Joi = require('joi');

// Schema for recording presence (used for both QR and Manual)
const recordPresenceSchema = Joi.object({
  training_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Training ID must be a number',
    'number.integer': 'Training ID must be an integer',
    'number.positive': 'Training ID must be positive',
    'any.required': 'Training ID is required'
  }),
  presence_type: Joi.string().valid('QR', 'Manual').required().messages({
    'string.empty': 'Presence type is required',
    'any.only': 'Presence type must be either "QR" or "Manual"',
    'any.required': 'Presence type is required'
  })
});

// Schema specifically for QR code scanning
const qrPresenceSchema = Joi.object({
  qr_code: Joi.string().required().messages({
    'string.empty': 'QR code is required',
    'any.required': 'QR code is required'
  })
});

// Schema for recording presence manually by Kadiv
const manualPresenceSchema = Joi.object({
  training_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Training ID must be a number',
    'number.positive': 'Training ID must be positive',
    'any.required': 'Training ID is required'
  }),
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  })
});

// Schema for generating QR code (for Kadiv)
const generateQrSchema = Joi.object({
  training_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Training ID must be a number',
    'number.positive': 'Training ID must be positive',
    'any.required': 'Training ID is required'
  }),
  expiry_minutes: Joi.number().integer().min(1).max(60).default(15).messages({
    'number.base': 'Expiry time must be a number',
    'number.min': 'Expiry time must be at least 1 minute',
    'number.max': 'Expiry time cannot exceed 60 minutes'
  })
});

module.exports = {
  recordPresenceSchema,
  qrPresenceSchema,
  manualPresenceSchema,
  generateQrSchema
};