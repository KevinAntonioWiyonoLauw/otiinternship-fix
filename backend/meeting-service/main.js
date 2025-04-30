require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('./internal/logger');
const meetingRoutes = require('./internal/routes/meetingRoutes');
const axios = require('axios');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { meetingReminderQueue } = require('./internal/queues');
const healthHandler = require('./internal/handlers/healthHandler');
const reminderProcessor = require('./internal/queues/reminderProcessor');


const app = express();
const PORT = process.env.PORT || 8002;

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
app.use('/api/meetings', meetingRoutes);

app.get('/health/light', healthHandler.lightHealthCheck);

app.get('/health', healthHandler.fullHealthCheck);


// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

meetingReminderQueue.process('check-reminders', reminderProcessor.processMeetingReminders);
meetingReminderQueue.process('single-meeting', reminderProcessor.processSingleMeetingReminder);

// Setup Bull Board monitoring UI
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullAdapter(meetingReminderQueue)
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

// Setup reminder scheduler using Bull
const scheduleReminders = async () => {
  logger.info('Setting up meeting reminder scheduler with Bull queue');
  
  // Clear existing jobs first to avoid duplicates
  try {
    const jobs = await meetingReminderQueue.getRepeatableJobs();
    for (const job of jobs) {
      await meetingReminderQueue.removeRepeatableByKey(job.key);
      logger.info(`Removed existing job with key: ${job.key}`);
    }
  } catch (err) {
    logger.error(`Error clearing existing jobs: ${err.message}`);
  }
  
  // Add recurring job - checks for upcoming meetings every 5 minutes
  meetingReminderQueue.add('check-reminders', {
    scheduledAt: new Date().toISOString(),
    automated: true
  }, {
    repeat: {
      cron: '*/5 * * * *'  
    },
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3
  });
  
  logger.info('Meeting reminder scheduler set up successfully');
};

// Start server
app.listen(PORT, () => {
  logger.info(`Meeting service running on port ${PORT}`);
  scheduleReminders();
});