const rateLimit = require('express-rate-limit');
const logger = require('../logger');

// Helper function untuk mengecek apakah user adalah KADIV
const isKadiv = (req) => {
  if (req.user && req.user.roles) {
    // Jika informasi role ada di user object
    return req.user.roles.some(role => role.role === 'KADIV');
  } else if (req.user && req.user.id) {
    // Fallback - cek via database jika perlu
    return req.user.isKadiv || false;
  }
  return false;
};

const skipRateLimitMiddleware = (req, res, next) => {
    // Skip rate limit untuk service-to-service atau jika flag skipRateLimit diset
    if (req.headers['x-service-name'] || req.skipRateLimit) {
      req.skipRateLimit = true;
    }
    next();
  };

// Rate limiter berbasis role untuk auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  // Kalau KADIV, limit 100, kalau bukan 10
  max: (req) => {
    // Periksa user dari request
    if (isKadiv(req)) {
      logger.info(`Higher rate limit applied for KADIV user: ${req.user?.id}`);
      return 100; // KADIV mendapat 100 request per 15 menit
    }
    return 30; // User biasa tetap 10 request per 15 menit
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const userInfo = req.user ? `for user ${req.user.id}` : `for IP ${req.ip}`;
    logger.warn(`Rate limit exceeded ${userInfo}`);
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  },
  // Add proper proxy configuration
  trustProxy: false,
  skip: (req) => req.skipRateLimit === true
});

// General rate limiter with higher limits for KADIVs
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: (req) => {
    if (isKadiv(req)) {
      return 200; // KADIV mendapat 200 request per menit
    }
    return 60; // User biasa tetap 60 request per menit
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`General rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  },
  // Add proper proxy configuration
  trustProxy: false,
  skip: (req) => req.skipRateLimit === true
});

module.exports = {
  authLimiter,
  generalLimiter,
  skipRateLimitMiddleware
};