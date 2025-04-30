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
const meetingReminderQueue = new Queue('meeting-reminders', redisConfig);

// Configure queue events
meetingReminderQueue.on('completed', (job, result) => {
  logger.info(`Meeting reminder job ${job.id} completed: sent ${result.sent}, skipped ${result.skipped}`);
});

meetingReminderQueue.on('failed', (job, err) => {
  logger.error(`Meeting reminder job ${job.id} failed: ${err.message}`);
});

// Configure queue error handlers
meetingReminderQueue.on('error', (error) => {
  logger.error(`Meeting reminder queue error: ${error.message}`);
});

// Clean old jobs periodically 
const cleanupOldJobs = async () => {
  try {
    await meetingReminderQueue.clean(86400000, 'completed');  // 1 day
    await meetingReminderQueue.clean(604800000, 'failed');    // 7 days
  } catch (error) {
    logger.error(`Error cleaning old jobs: ${error.message}`);
  }
};

// Run cleanup daily
setInterval(cleanupOldJobs, 86400000);

module.exports = {
  meetingReminderQueue
};