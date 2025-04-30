const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../redisClient');
const logger = require('../logger');

const createRedisStore = (prefix) => {
  return new RedisStore({
    // Connect to the Redis client
    sendCommand: (...args) => redisClient.call(...args),
    prefix: prefix || 'rl:'
  });
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Configure standard rate limiter
const createRateLimiter = (windowMs, max, keyGenerator = undefined, prefix = undefined) => {
  return rateLimit({
    windowMs: windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (isDevelopment ? 10 * 1000 : 60 * 1000), 
    max: max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 1000 : 100), 
    standardHeaders: true, 
    legacyHeaders: false, 

    store: createRedisStore(prefix),
    keyGenerator: keyGenerator || ((req) => {
      return req.user?.id || req.ip;
    }),
    handler: (req, res) => {
      logger.warn({
        message: 'Rate limit exceeded',
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        requestId: req.id
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    },
    skip: (req) => {
      // Skip rate limiting for service-to-service communications
      // or if we're in development mode and the request has the development header
      return (req.headers['x-service-name'] && req.headers['x-skip-rate-limit'] === 'true') ||
             (isDevelopment && req.headers['x-development-mode'] === 'true');
    }
  });
};

// Standard rate limiter - with unique prefix
const standardRateLimiter = createRateLimiter(undefined, undefined, undefined, 'standard:');

// More restrictive rate limiter for auth endpoints - with unique prefix
const authRateLimiter = createRateLimiter(
  isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000, 
  isDevelopment ? 100 : 60, 
  undefined, 
  'auth:'
);

module.exports = {
  standardRateLimiter,
  authRateLimiter,
  createRateLimiter
};