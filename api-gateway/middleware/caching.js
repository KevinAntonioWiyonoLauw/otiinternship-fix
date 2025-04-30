const redisClient = require('../redisClient');
const logger = require('../logger');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Default cache expiration in seconds
const DEFAULT_CACHE_EXPIRATION = isDevelopment ? 300 : 60; // 5 minutes in development, 1 minute in production

const CACHE_EXCLUSIONS = [
    // Auth (semua operasi write)
    '/api/auth/*',
  
    // Health checks
    '/health',
    '/health/*',
  
    // Presence (QR scan/generate + manual record)
    '/api/presence',
    '/api/presence/*',
  
    // Meetings (buat/join/delete/reminders)
    '/api/meetings',
    '/api/meetings/*',
  
    // Trainings (buat/enroll/delete/reminders/conflict)
    '/api/trainings',
    '/api/trainings/*',
  
    // Progress (submit/accept/reject)
    '/api/progress',
    '/api/progress/*',
  
    // Aspirasi (submit/delete)
    '/api/aspirasi',
    '/api/aspirasi/*',
  
    // Email (kirim berbagai email)
    '/api/email/*'
  ];

const shouldCacheRequest = (req) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Skip excluded paths
  if (CACHE_EXCLUSIONS.some(path => req.originalUrl.includes(path))) {
    return false;
  }
  
  // In development, we can cache more aggressively
  if (isDevelopment) {
    // Allow caching of more endpoints during development
    return true;
  }
  
  return true;
};

const generateCacheKey = (req) => {
  // Create a unique cache key based on:
  // 1. The full URL (including query params)
  // 2. User ID if authenticated (for user-specific responses)
  const userId = req.user?.id ? `user:${req.user.id}` : 'anonymous';
  return `cache:${userId}:${req.originalUrl}`;
};

const cachingMiddleware = () => {
  return async (req, res, next) => {
    try {
      // Skip caching if not appropriate
      if (!shouldCacheRequest(req)) {
        return next();
      }
      
      // Generate cache key
      const cacheKey = generateCacheKey(req);
      
      // Check cache
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        // Cache hit
        const parsedResponse = JSON.parse(cachedResponse);
        
        // Add cache header to indicate cache hit
        res.setHeader('X-Cache', 'HIT');
        
        logger.debug({
          message: 'Cache hit',
          key: cacheKey,
          requestId: req.id
        });
        
        return res.status(parsedResponse.status).json(parsedResponse.data);
      }
      
      // Cache miss, continue to API but intercept the response
      res.setHeader('X-Cache', 'MISS');
      
      // Store the original JSON method
      const originalJson = res.json;
      
      // Override json method
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Store in cache
          const responseToCache = {
            status: res.statusCode,
            data: data
          };
          
          // Get custom cache header if provided by the service
          // In development, use longer TTL if not specified
          const defaultTtl = isDevelopment ? 300 : DEFAULT_CACHE_EXPIRATION;
          const cacheTtl = parseInt(res.getHeader('X-Cache-TTL') || defaultTtl);
          
          redisClient.setex(cacheKey, cacheTtl, JSON.stringify(responseToCache))
            .catch(err => logger.error({
              message: `Redis cache error: ${err.message}`,
              requestId: req.id
            }));
            
          logger.debug({
            message: 'Cache miss, storing response',
            key: cacheKey,
            ttl: cacheTtl,
            requestId: req.id
          });
        }
        
        // Call the original json method
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      logger.error({
        message: `Cache middleware error: ${error.message}`,
        requestId: req.id
      });
      next();
    }
  };
};

module.exports = cachingMiddleware;