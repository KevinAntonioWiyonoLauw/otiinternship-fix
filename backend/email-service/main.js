require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./internal/logger');
const emailRoutes = require('./internal/routes/emailRoutes');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const healthHandler = require('./internal/handlers/healthHandler');

const app = express();
const PORT = process.env.PORT || 8002;

app.disable('x-powered-by');

app.use(helmet());

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Konfigurasi cookie secure
app.use((req, res, next) => {
  res.cookie = function(name, value, options) {
    options = options || {};
    
    // Selalu gunakan SameSite=Strict
    options.sameSite = 'Strict';
    
    // Gunakan Secure=true di production
    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }
    
    options.httpOnly = true;
    
    return res.cookie(name, value, options);
  };
  
  next();
});

// Rate limiting untuk mencegah brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 request per IP dalam 15 menit
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Apply rate limiting
app.use(limiter);

// API Routes
app.use('/api/email', emailRoutes);

app.get('/health/light', healthHandler.lightHealthCheck);

app.get('/health', healthHandler.fullHealthCheck);

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const setupScheduler = () => {
  const emailService = require('./internal/services/emailService');
  const emailRepository = require('./internal/repositories/emailRepo');
  
  // Retry failed emails every 30 minutes
  setInterval(async () => {
    try {
      logger.info('Running scheduled email retry task');
      const pendingCount = await emailRepository.countPendingEmails();
      
      if (pendingCount > 0) {
        logger.info(`Found ${pendingCount} pending emails to retry`);
        const result = await emailService.retryPendingEmails();
        logger.info(`Email retry completed: ${result.success} succeeded, ${result.failed} failed`);
      } else {
        logger.info('No pending emails to retry');
      }
    } catch (error) {
      logger.error(`Scheduler task error: ${error.message}`);
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  // Cleanup old logs every day
  setInterval(async () => {
    try {
      logger.info('Running scheduled email log cleanup');
      const deletedCount = await emailRepository.cleanupOldEmailLogs(30); // Keep 30 days of logs
      logger.info(`Email log cleanup completed: ${deletedCount} old records deleted`);
    } catch (error) {
      logger.error(`Scheduler cleanup task error: ${error.message}`);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
};

// Start server
app.listen(PORT, () => {
  logger.info(`Email service running on port ${PORT}`);
  setupScheduler(); // Start the scheduler
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
  });
});