const trainingService = require('../services/trainingService');
const logger = require('../logger');

/**
 * Process training reminders
 * @param {Object} job Bull job containing data
 * @returns {Object} Processing results
 */
const processTrainingReminders = async (job) => {
  try {
    logger.info(`Processing training reminders job ${job.id}`);
    
    // Update job progress
    await job.progress(10);
    
    // Get trainings for tomorrow
    const result = await trainingService.sendTrainingReminders();
    
    // Update job progress before completion
    await job.progress(100);
    
    return {
      sent: result.count,
      failed: result.failed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing training reminders: ${error.message}`);
    throw error; // Retry or move to failed
  }
};

/**
 * Process single training reminder
 * @param {Object} job Bull job with training data
 * @returns {Object} Processing results
 */
const processSingleTrainingReminder = async (job) => {
  try {
    const { trainingId } = job.data;
    logger.info(`Processing single training reminder job ${job.id} for training ${trainingId}`);
    
    // Get training details
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      throw new Error(`Training not found: ${trainingId}`);
    }
    
    // Send reminder for specific training
    const result = await trainingService.sendReminderForTraining(training);
    
    return {
      trainingId,
      sent: result.count,
      failed: result.failed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing single training reminder: ${error.message}`);
    throw error;
  }
};

module.exports = {
  processTrainingReminders,
  processSingleTrainingReminder
};