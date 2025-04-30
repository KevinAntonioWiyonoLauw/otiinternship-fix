require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('./internal/logger');
const trainingRoutes = require('./internal/routes/trainingRoutes');
const trainingService = require('./internal/services/trainingService');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const healthHandler = require('./internal/handlers/healthHandler');
const { ExpressAdapter } = require('@bull-board/express');
const { reminderQueue, emailBatchQueue } = require('./internal/queues');
const reminderProcessor = require('./internal/queues/reminderProcessor');

const app = express();
const PORT = process.env.PORT || 8004;


// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/trainings', trainingRoutes);

// Add this cache object near the top of the file, after imports
const healthCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 10000; // 10 seconds

// Dedicated lightweight health check for Docker
app.get('/health/light', healthHandler.lightHealthCheck);

// Main health check route with support for light mode via query param
app.get('/health', healthHandler.fullHealthCheck);


// Helper function for timeouts
function timeoutPromise(ms, operation) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout getting ${operation}`)), ms)
  );
}


const scheduleTrainingReminders = async () => {
  logger.info('Setting up training reminder scheduler');
  try {
    const jobs = await reminderQueue.getRepeatableJobs();
    for (const job of jobs) {
      await reminderQueue.removeRepeatableByKey(job.key);
      logger.info(`Removed existing job with key: ${job.key}`);
    }
  } catch (err) {
    logger.error(`Error clearing existing jobs: ${err.message}`);
  }
  reminderQueue.add('check-reminders', {
    scheduledAt: new Date().toISOString(),
    automated: true
  }, {
    repeat: { cron: '*/5 * * * *' },
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3
  });
  logger.info('Training reminder scheduler set up successfully');
};

// Setup queue processors
reminderQueue.process('check-reminders', reminderProcessor.processTrainingReminders);
reminderQueue.process('single-training', reminderProcessor.processSingleTrainingReminder);
reminderQueue.process('cleanup-jobs', async (job) => {
  try {
    logger.info(`Cleaning up old jobs`);
    await reminderQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 1 day
    await reminderQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days
    await emailBatchQueue.clean(24 * 60 * 60 * 1000, 'completed');
    await emailBatchQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
    return { success: true, message: 'Cleanup completed' };
  } catch (error) {
    logger.error(`Error cleaning up jobs: ${error.message}`);
    throw error;
  }
});

// Queue events handlers
reminderQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} (${job.name}) completed: ${JSON.stringify(result)}`);
});

reminderQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
});

reminderQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} (${job.name}) stalled`);
});

// Setup Bull Board monitoring UI (Admin only)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullAdapter(reminderQueue),
    new BullAdapter(emailBatchQueue)
  ],
  serverAdapter
});

// Secure the Bull Board UI with basic authentication
app.use('/admin/queues', (req, res, next) => {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  
  // Check Basic Auth
  const auth = req.headers.authorization;
  if (!auth || auth.indexOf('Basic ') !== 0) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  const username = credentials[0];
  const password = credentials[1];
  
  if (username !== adminUsername || password !== adminPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    return res.status(401).send('Invalid credentials');
  }
  
  next();
}, serverAdapter.getRouter());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down training service...');
  
  try {
    // Close Bull queues
    await reminderQueue.close();
    await emailBatchQueue.close();
    logger.info('Bull queues closed');
  } catch (error) {
    logger.error(`Error closing Bull queues: ${error.message}`);
  }
  
  // Exit process
  process.exit(0);
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
  logger.info(`Training service running on port ${PORT}`);
  scheduleTrainingReminders().catch(err => {
    logger.error(`Failed to schedule training reminders: ${err.message}`);
  });
});