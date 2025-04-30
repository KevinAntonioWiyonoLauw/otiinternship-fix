const resetPasswordEmailSchema = require('../schemas/resetPasswordEmailSchema');
const reminderEmailSchema = require('../schemas/reminderEmailSchema');
const trainingReminderSchema = require('../schemas/trainingReminderSchema');
const emailService = require('../services/emailService');
const logger = require('../logger');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitizer');

// Email reset password handler
const sendResetPasswordEmail = async (req, res) => {
  try {
    const { error, value } = resetPasswordEmailSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Sanitize input to prevent XSS
    const sanitizedData = {
      email: sanitizeHtml(value.email),
      reset_token: sanitizeHtml(value.reset_token),
      user_id: sanitizeHtml(value.user_id)
    };

    // Queue email with sanitized data but don't wait
    emailService.sendResetPasswordEmail(sanitizedData)
      .catch(err => logger.error(`Background reset email error: ${err.message}`));

    // Respond immediately
    return res.status(200).json({
      success: true,
      message: 'Reset password email queued for delivery'
    });
  } catch (error) {
    logger.error(`Error queuing reset password email: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to queue reset password email'
    });
  }
};

// Meeting reminder email handler
const sendMeetingReminder = async (req, res) => {
  try {
    const { error, value } = reminderEmailSchema.validate(req.body);

    if (error) {
      logger.warn(`Invalid meeting reminder request: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Sanitize input to prevent XSS
    const sanitizedData = sanitizeObject(value);

    // Log untuk debugging
    logger.debug(`Processing meeting reminder request: ${JSON.stringify({
      email: sanitizedData.email,
      meeting_id: sanitizedData.meeting_id,
      meeting_date: sanitizedData.meeting_date,
      meeting_time: sanitizedData.meeting_time
    })}`);

    // Kirim respons sukses segera
    res.status(200).json({
      success: true,
      message: 'Meeting reminder email queued for delivery'
    });

    // Proses email di background setelah response dikirim
    process.nextTick(async () => {
      try {
        await emailService.sendMeetingReminder(sanitizedData);
        logger.info(`Background meeting reminder email sent successfully to ${sanitizedData.email}`);
      } catch (err) {
        logger.error(`Background meeting reminder email failed: ${err.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error queueing meeting reminder: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process email request'
    });
  }
};

// Batch training reminder handler
const sendBatchTrainingReminder = async (req, res) => {
  try {
    // Validate request
    if (!req.body.reminders || !Array.isArray(req.body.reminders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request - reminders array required'
      });
    }

    // Respond immediately
    res.status(200).json({
      success: true,
      message: `Batch of ${req.body.reminders.length} training reminder emails queued for delivery`
    });

    // Process emails in background
    process.nextTick(async () => {
      try {
        const results = { success: 0, failed: 0 };

        // Process emails in parallel with concurrency limit
        const processBatch = async (batch) => {
          const batchResults = await Promise.all(batch.map(async (reminderData) => {
            try {
              // Validate each item individually
              const { error } = trainingReminderSchema.validate(reminderData);
              if (error) {
                logger.warn(`Invalid training reminder in batch: ${error.message}`);
                results.failed++;
                return { success: false, email: reminderData.email || 'unknown', error: error.message };
              }

              // Sanitize data before sending
              const sanitizedData = sanitizeObject(reminderData);

              await emailService.sendTrainingReminder(sanitizedData);
              results.success++;
              return { success: true, email: sanitizedData.email };
            } catch (err) {
              logger.error(`Failed to send email to ${reminderData.email}: ${err.message}`);
              results.failed++;
              return { success: false, email: reminderData.email, error: err.message };
            }
          }));

          return batchResults;
        };

        // Validate before processing
        if (!req.body.reminders || !Array.isArray(req.body.reminders) || req.body.reminders.length === 0) {
          logger.warn('Invalid batch: empty or invalid reminders array');
          return;
        }

        // Batasi ukuran array untuk mencegah DOS
        const maxReminders = 100; // Batasi maksimal 100 email per batch
        const reminders = req.body.reminders.slice(0, maxReminders);

        // Peringatan jika ada pemotongan
        if (req.body.reminders.length > maxReminders) {
          logger.warn(`Batch size limited from ${req.body.reminders.length} to ${maxReminders}`);
        }

        // Split into smaller batches and process with concurrency limit
        const batchSize = 5; // Process 5 emails at a time
        for (let i = 0; i < reminders.length; i += batchSize) {
          const batch = reminders.slice(i, i + batchSize);
          await processBatch(batch);

          if (i + batchSize < reminders.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        logger.info(`Batch processing completed: ${results.success} sent, ${results.failed} failed`);
      } catch (err) {
        logger.error(`Error in batch processing: ${err.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error handling batch request: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process batch request'
    });
  }
};

// Training reminder single email handler
const sendTrainingReminder = async (req, res) => {
  try {
    // Validate request
    const { error, value } = trainingReminderSchema.validate(req.body);

    if (error) {
      logger.warn(`Invalid training reminder request: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Sanitize input to prevent XSS
    const sanitizedData = sanitizeObject(value);

    // Log untuk debugging
    logger.debug(`Processing training reminder request: ${JSON.stringify({
      email: sanitizedData.email,
      training_id: sanitizedData.training_id,
      training_date: sanitizedData.training_date,
      training_time: sanitizedData.training_time
    })}`);

    // Kirim respons sukses segera
    res.status(200).json({
      success: true,
      message: 'Training reminder email queued for delivery'
    });

    // Proses email di background setelah response dikirim
    process.nextTick(async () => {
      try {
        await emailService.sendTrainingReminder(sanitizedData);
        logger.info(`Background training reminder email sent successfully to ${sanitizedData.email}`);
      } catch (err) {
        logger.error(`Background training reminder email failed: ${err.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error queueing training reminder: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process email request'
    });
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendMeetingReminder,
  sendTrainingReminder,
  sendBatchTrainingReminder
};