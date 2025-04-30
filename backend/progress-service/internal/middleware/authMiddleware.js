const axios = require('axios');
const { AppError } = require('../Exceptions/errorHandler');
const logger = require('../logger');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';

// Middleware to verify JWT token and extract user info
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Auth Service
    const response = await axios.get(`${authServiceUrl}/api/auth/me`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-service-name': 'progress-service' // Add this header
      }
    });
    
    if (!response.data || !response.data.success) {
      throw new AppError('Invalid or expired token', 401);
    }
    
    // Add user info to request
    req.user = response.data.user;
    req.token = token;
    
    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        logger.error(`Auth service error: ${error.response.status}`);
      } else {
        logger.error(`Auth service connection error: ${error.message}`);
      }
      return next(new AppError('Authentication failed', 401));
    }
    
    next(error);
  }
};

// Middleware to verify user is Kadiv HD
const requireKadivHD = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const token = req.token;
    
    // Get user divisions from Auth Service
    const response = await axios.get(`${authServiceUrl}/api/users/${userId}/divisions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data || !response.data.divisions) {
      throw new AppError('Failed to retrieve user divisions', 500);
    }
    
    // Check if user has HD-KADIV role
    const isKadivHD = response.data.divisions.some(
      div => div.name === 'HD' && div.role === 'KADIV'
    );
    
    if (!isKadivHD) {
      logger.warn(`User ${userId} attempted to access admin endpoint without HD-KADIV role`);
      throw new AppError('Access denied. Only HD-KADIV can perform this action', 403);
    }
    
    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(`Error checking HD-KADIV status: ${error.message}`);
      return next(new AppError('Authorization check failed', 500));
    }
    
    next(error);
  }
};

module.exports = {
  authenticate,
  requireKadivHD
};