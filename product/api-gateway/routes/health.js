const express = require('express');
const axios = require('axios');
const redisClient = require('../redisClient');
const logger = require('../logger');

const router = express.Router();

// Cache for health check responses
const healthCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 10000; // 10 seconds

// Light health check endpoint
router.get('/light', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Full health check endpoint
router.get('/', async (req, res) => {
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
    
    // Check Redis connection
    let redisStatus = false;
    try {
      const redisResult = await redisClient.ping();
      redisStatus = redisResult === 'PONG';
    } catch (redisError) {
      logger.warn(`Redis health check failed: ${redisError.message}`);
    }
    
    // Create axios requests for all service health checks
    const services = [
      { name: 'auth-service', url: `${process.env.AUTH_SERVICE_URL}/health/light` },
      { name: 'email-service', url: `${process.env.EMAIL_SERVICE_URL}/health/light` },
      { name: 'meeting-service', url: `${process.env.MEETING_SERVICE_URL}/health/light` },
      { name: 'training-service', url: `${process.env.TRAINING_SERVICE_URL}/health/light` },
      { name: 'aspirasi-service', url: `${process.env.ASPIRASI_SERVICE_URL}/health/light` },
      { name: 'presence-service', url: `${process.env.PRESENCE_SERVICE_URL}/health/light` },
      { name: 'progress-service', url: `${process.env.PROGRESS_SERVICE_URL}/health/light` }
    ];
    
    const serviceChecks = services.map(async (service) => {
      try {
        const response = await axios.get(service.url, { timeout: 3000 });
        return {
          name: service.name,
          status: response.status === 200 ? 'ok' : 'error',
          response_time_ms: response.headers['x-response-time'] || 'unknown'
        };
      } catch (error) {
        logger.warn(`Health check failed for ${service.name}: ${error.message}`);
        return {
          name: service.name,
          status: 'error',
          error: error.message
        };
      }
    });
    
    // Execute all health checks in parallel
    const results = await Promise.all(serviceChecks);
    
    // Determine overall status
    const overallStatus = results.every(result => result.status === 'ok') ? 'ok' : 'degraded';
    
    // Prepare health response
    const healthResponse = {
      status: overallStatus,
      service: 'api-gateway',
      version: '1.0.0',
      redis: redisStatus ? 'connected' : 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: results
    };
    
    // Cache the response
    healthCache.data = healthResponse;
    healthCache.timestamp = now;
    
    res.status(200).json(healthResponse);
    
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      service: 'api-gateway',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;