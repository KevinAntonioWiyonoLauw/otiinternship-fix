const logger = require('../logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper to catch errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.details || null;
  
  // Log error
  logger.error(`Error: ${message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    details
  });
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler
};