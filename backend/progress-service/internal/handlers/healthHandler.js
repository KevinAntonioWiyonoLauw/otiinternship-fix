const logger = require('../logger');
const db = require('../../db');

// Cache for health check responses to reduce load
const healthCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 10000; // 10 seconds cache lifetime

/**
 * Light health check that responds immediately without DB checks
 * Used by Docker health checks to avoid resource contention
 */
exports.lightHealthCheck = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'progress-service',
    version: '1.0.0',
    mode: 'light',
    timestamp: new Date().toISOString()
  });
};

/**
 * Full health check with database verification
 * Only use this for detailed diagnostics, not for container orchestration
 */
exports.fullHealthCheck = async (req, res) => {
  // If light mode is specified, return lightweight response
  if (req.query.mode === 'light' || req.query.skipDependencies === 'true') {
    return exports.lightHealthCheck(req, res);
  }
  
  try {
    // Return cached response if available and fresh
    const now = Date.now();
    if (healthCache.data && (now - healthCache.timestamp < CACHE_TTL)) {
      return res.status(200).json({
        ...healthCache.data,
        cached: true,
        cache_age_ms: now - healthCache.timestamp
      });
    }
    
    // Check DB connection with timeout
    let dbStatus = false;
    try {
      const dbCheckPromise = db.$queryRaw`SELECT 1 AS check`;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 1000)
      );
      
      dbStatus = await Promise.race([dbCheckPromise, timeoutPromise]);
    } catch (dbError) {
      logger.warn(`DB health check failed: ${dbError.message}`);
    }
    
    // Prepare response
    const healthResponse = {
      status: 'ok',
      service: 'progress-service',
      version: '1.0.0',
      database: dbStatus ? 'connected' : 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    // Cache the response
    healthCache.data = healthResponse;
    healthCache.timestamp = now;
    
    res.status(200).json(healthResponse);
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
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