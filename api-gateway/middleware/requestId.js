const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

const requestIdMiddleware = (req, res, next) => {
  // Generate a unique request ID
  const requestId = uuidv4();
  
  // Attach to request object
  req.id = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Record request start time
  req.startTime = Date.now();
  
  // Log incoming request
  logger.info({
    message: 'Request received',
    method: req.method,
    url: req.originalUrl,
    requestId
  });
  
  // Capture response finishing
  res.on('finish', () => {
    // Calculate latency
    const latency = Date.now() - req.startTime;
    
    // Log completed request
    logger.info({
      message: 'Request completed',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      latency: `${latency}ms`,
      requestId
    });
  });
  
  next();
};

module.exports = requestIdMiddleware;