require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./internal/logger');
const presenceRoutes = require('./internal/routes/presenceRoutes');
const prisma = require('./db/index');
const axios = require('axios');
const { getQRMetrics } = require('./internal/utils/qrCodeUtil');
const healthHandler = require('./internal/handlers/healthHandler');

const app = express();
const PORT = process.env.PORT || 8006;

// Health check optimization
const healthCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 10000; // 10 seconds

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting for all endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Special rate limiter for QR scanning to prevent brute force attacks
const qrScanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 10 requests per minute
  message: {
    success: false,
    message: 'Too many QR scan attempts, please try again later.'
  }
});

// Apply general rate limiting
app.use(limiter);

// Apply QR scan rate limiter to specific routes
app.use('/api/presence/scan', qrScanLimiter);

// Route logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/presence', presenceRoutes);

// Dedicated lightweight health check for Docker
app.get('/health/light', healthHandler.lightHealthCheck);

// Main health check route with support for light mode via query param
app.get('/health', healthHandler.fullHealthCheck);

// Admin route for monitoring
app.get('/admin/metrics', (req, res) => {
  // Simple admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY || 'admin-secret-key'}`) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access to metrics'
    });
  }
  
  const metrics = {
    qr: getQRMetrics(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };
  
  res.status(200).json({
    success: true,
    metrics
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Presence service running on port ${PORT}`);
});