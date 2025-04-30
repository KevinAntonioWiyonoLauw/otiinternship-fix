const jwt = require('jsonwebtoken');
const logger = require('../logger');

const authMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;
    req.token = token;  // Store token for service-to-service communication

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);

    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Optional middleware - allows anonymous access but attaches user info if authenticated
const optionalAuthMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - continue as anonymous
    req.user = null;
    req.token = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;
    req.token = token;
  } catch (error) {
    // Invalid token - continue as anonymous
    logger.warn(`Invalid authentication attempt: ${error.message}`);
    req.user = null;
    req.token = null;
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};