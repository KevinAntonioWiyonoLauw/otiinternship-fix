const Joi = require('joi');

const resetPasswordEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  reset_token: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
    'any.required': 'Reset token is required'
  }),
  user_id: Joi.string().uuid().optional()
});

module.exports = resetPasswordEmailSchema;