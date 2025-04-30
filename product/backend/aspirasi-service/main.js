require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const logger = require('./internal/logger');
const healthHandler = require('./internal/handlers/healthHandler');
const aspirasiRoutes = require('./internal/routes/aspirasiRoutes');

const healthCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 10000; // 10 seconds

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

// Rate limiting for all endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting
app.use(limiter);

// Route logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/aspirasi', aspirasiRoutes);

// Dedicated lightweight health check for Docker
app.get('/health/light', healthHandler.lightHealthCheck);

// Main health check route with support for light mode via query param
app.get('/health', healthHandler.fullHealthCheck);


// Helper function for getting aspirasi metrics
async function getAspirasiCount() {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT COUNT(*) FROM aspirasi');
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error(`Error getting aspirasi count: ${error.message}`);
    return 0;
  }
}

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
  logger.info(`Aspirasi service running on port ${PORT}`);
});