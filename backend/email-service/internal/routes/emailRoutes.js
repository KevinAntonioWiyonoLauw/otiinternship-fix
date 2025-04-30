const express = require('express');
const {
  sendResetPasswordEmail,
  sendMeetingReminder,
  sendTrainingReminder,
  sendBatchTrainingReminder
} = require('../handlers/emailHandler');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitizer');
const resetPasswordEmailSchema = require('../schemas/resetPasswordEmailSchema');
const logger = require('../logger');

const router = express.Router();

// Route for sending reset password email
router.post('/reset-password', sendResetPasswordEmail);

// Route for sending meeting reminder email
router.post('/meeting-reminder', sendMeetingReminder);

// Route for sending training reminder email
router.post('/training-reminder', sendTrainingReminder);

router.post('/batch-training-reminder', sendBatchTrainingReminder);

// Generic endpoint for compatibility with auth service
router.post('/send', async (req, res) => {
  try {
    // Validate inputs exist and have correct types
    const body = req.body || {};
    const to = typeof body.to === 'string' ? body.to : '';
    const text = typeof body.text === 'string' ? body.text : '';

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Email recipient (to) is required and must be a string'
      });
    }

    // Sanitize all inputs to prevent XSS
    const sanitizedTo = sanitizeHtml(to);
    const sanitizedText = sanitizeHtml(text);

    // Extract token from the URL in the text, with proper type checking
    let reset_token = null;
    if (sanitizedText) {
      const tokenMatch = sanitizedText.match(/token=([a-f0-9]{32,64})/);
      reset_token = tokenMatch && tokenMatch[1] ? sanitizeHtml(tokenMatch[1]) : null;
    }

    // Log for debugging
    logger.debug(`Processing email send request to: ${sanitizedTo}, token extracted: ${reset_token ? 'Yes' : 'No'}`);

    // Create sanitized data object
    const emailData = {
      email: sanitizedTo,
      reset_token: reset_token,
      user_id: body.user_id && typeof body.user_id === 'string' ? sanitizeHtml(body.user_id) : null
    };

    // Validate against schema
    const { error } = resetPasswordEmailSchema.validate(emailData);
    if (error) {
      logger.warn(`Invalid reset password data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Call email service directly rather than modifying the request object
    const emailService = require('../services/emailService');
    await emailService.sendResetPasswordEmail(emailData);

    return res.status(200).json({
      success: true,
      message: 'Reset password email sent successfully'
    });
  } catch (error) {
    logger.error(`Error in /send endpoint: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process email request'
    });
  }
});

module.exports = router;