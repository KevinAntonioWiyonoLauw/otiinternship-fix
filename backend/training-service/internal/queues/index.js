const Queue = require('bull');
const logger = require('../logger');

// Redis connection config
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};

// Create queues
const reminderQueue = new Queue('training-reminder', redisConfig);
const emailBatchQueue = new Queue('email-batch-processing', redisConfig);

// Configure queue events
reminderQueue.on('completed', (job, result) => {
  logger.info(`Reminder job ${job.id} completed: sent ${result.sent}, failed ${result.failed}`);
});

reminderQueue.on('failed', (job, err) => {
  logger.error(`Reminder job ${job.id} failed: ${err.message}`);
});

emailBatchQueue.on('completed', (job, result) => {
  logger.info(`Email batch job ${job.id} completed: sent ${result.sent}, failed ${result.failed}`);
});

emailBatchQueue.on('failed', (job, err) => {
  logger.error(`Email batch job ${job.id} failed: ${err.message}`);
});

// Configure queue error handlers
reminderQueue.on('error', (error) => {
  logger.error(`Reminder queue error: ${error.message}`);
});

emailBatchQueue.on('error', (error) => {
  logger.error(`Email batch queue error: ${error.message}`);
});

// Clean old jobs periodically 
const cleanupOldJobs = async () => {
  try {
    await reminderQueue.clean(86400000, 'completed'); // Remove completed jobs older than 1 day
    await reminderQueue.clean(604800000, 'failed');   // Remove failed jobs older than 7 days
    await emailBatchQueue.clean(86400000, 'completed');
    await emailBatchQueue.clean(604800000, 'failed');
  } catch (error) {
    logger.error(`Error cleaning old jobs: ${error.message}`);
  }
};

// Run cleanup daily
setInterval(cleanupOldJobs, 86400000);

module.exports = {
  reminderQueue,
  emailBatchQueue
};