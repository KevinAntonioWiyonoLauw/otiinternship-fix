const logger = require('../logger');
const db = require('../../db');
const emailService = require('../services/emailService');

// Health check response cache to avoid frequent DB checks
const healthCache = {
  data: null,
  timestamp: 0
};

// Cache TTL in milliseconds (default: 30 seconds)
const CACHE_TTL = 30 * 1000;

exports.lightHealthCheck = (req, res) => {
  // Simple check, doesn't verify dependencies
  return res.status(200).json({
    status: 'ok',
    service: 'email-service',
    timestamp: new Date().toISOString()
  });
};

exports.fullHealthCheck = async (req, res) => {
  // Check if we should skip dependency checks (useful for some dev/test scenarios)
  const skipDependencies = req.query.skipDependencies === 'true';

  try {
    // Use cached response if it's still valid
    if (healthCache.data && (Date.now() - healthCache.timestamp < CACHE_TTL)) {
      return res.status(healthCache.data.status === 'ok' ? 200 : 503).json(healthCache.data);
    }

    let dbStatus = 'disconnected';
    let smtpStatus = 'error'; // Added back SMTP check

    // Check DB connection
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbError) {
      logger.error(`DB health check failed: ${dbError.message}`);
    }

    // Check SMTP connection with Nodemailer verify()
    try {
      await emailService.verifyEmailConnection();
      smtpStatus = 'connected';
    } catch (smtpError) {
      logger.error(`SMTP health check failed: ${smtpError.message}`);
    }

    const healthData = {
      status: dbStatus === 'connected' && (skipDependencies || smtpStatus === 'connected') ? 'ok' : 'error',
      service: 'email-service',
      version: '1.0.0',
      dependencies: {
        database: dbStatus,
        smtp: smtpStatus, // Added back SMTP status
      },
      timestamp: new Date().toISOString()
    };

    // Update cache
    healthCache.data = healthData;
    healthCache.timestamp = Date.now();

    return res.status(healthData.status === 'ok' ? 200 : 503).json(healthData);

  } catch (error) {
    logger.error(`Full health check failed unexpectedly: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Health check endpoint failed',
      error: error.message
    });
  }
};

/**
 * Check health of auth service for service-to-service health checks
 * @param {string} baseUrl - Base URL of auth service API
 * @param {string} [authToken] - Optional auth token for authenticated checks
 * @returns {Promise<boolean>} - True if service is healthy
 */
exports.checkAuthServiceHealth = async (baseUrl, authToken = null) => {
  try {
    const axios = require('axios');
    
    const headers = {
      'x-health-check': 'true',
      'x-skip-rate-limit': 'true'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await axios.get(
      `${baseUrl}/health?mode=light&skipDependencies=true`,
      {
        timeout: 2000,
        headers
      }
    );
    
    return response.status === 200 && response.data.status === 'ok';
  } catch (error) {
    logger.warn(`External auth service health check failed: ${error.message}`);
    return false;
  }
};