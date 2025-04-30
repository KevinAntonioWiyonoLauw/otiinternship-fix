require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./logger');
const requestIdMiddleware = require('./middleware/requestId');
const { authMiddleware, requireAuth } = require('./middleware/auth');
const { standardRateLimiter, authRateLimiter } = require('./middleware/rateLimit');
const cachingMiddleware = require('./middleware/caching');
const healthRoutes = require('./routes/health');
const createDirectHandlers = require('./routes/direct');
const redisClient = require('./redisClient');

// Initialize Express app
const app = express();

app.set('trust proxy', true);

const PORT = process.env.PORT || 8000;

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // Cache preflight requests for 10 minutes
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.error({
        message: 'Invalid JSON in request body',
        error: e.message,
        body: buf.toString(),
        path: req.path,
        method: req.method
      });
      throw new Error('Invalid JSON in request body');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Add request ID and logging
app.use(requestIdMiddleware);

// Apply rate limiting
app.use('/api/auth', authRateLimiter);
app.use(standardRateLimiter);

// Apply authentication middleware
app.use(authMiddleware);
app.use(requireAuth);

// Apply caching middleware
app.use(cachingMiddleware());

// Mount health check routes
app.use('/health', healthRoutes);

// Add route for clearing cache (admin only)
app.delete('/admin/cache', async (req, res) => {
  try {
    // Check for admin authorization
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Get pattern to clear (default to all cache)
    const pattern = req.query.pattern || 'cache:*';
    
    // Clear matching keys
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    
    logger.info({
      message: 'Cache cleared',
      pattern,
      count: keys.length,
      requestId: req.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully',
      count: keys.length
    });
  } catch (error) {
    logger.error({
      message: `Cache clear error: ${error.message}`,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

// Setup proxy routes
createDirectHandlers(app);

// 404 handler
app.use((req, res) => {
  logger.warn({
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    requestId: req.id
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({
    message: `Unhandled error: ${err.message}`,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    requestId: req.id
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;