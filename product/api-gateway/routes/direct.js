const axios = require('axios');
const express = require('express');
const logger = require('../logger');

const FormData = require('form-data');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit, matching auth service
});

/**
 * Create a router that handles requests directly instead of proxying
 * @param {Express} app - Express application
 */
const createDirectHandlers = (app) => {

  const authCache = require('../services/authCache');

  app.post('/api/auth/import-csv', upload.single('file'), async (req, res) => {
    const requestId = req.id || 'unknown';
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL;
      const serviceUrl = `${authServiceUrl}/api/auth/import-csv`;
  

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const response = await axios.post(serviceUrl, formData, {
        headers: {
          'X-Service-Name': 'api-gateway',
          'X-Request-ID': requestId,
          'Authorization': req.headers.authorization,
          ...formData.getHeaders() 
        }
      });
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      logger.error({
        message: `CSV Import error: ${error.message}`, 
        requestId
      });
      
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;
      
      res.status(statusCode).json({
        success: false,
        message: 'CSV import failed', 
        error: errorMessage
      });
    }
  });
  
  app.post('/api/auth/logout', async (req, res) => {
    const normalizedAuthUrl = normalizeUrl(process.env.AUTH_SERVICE_URL);
    const requestId = req.id || 'unknown';
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1];
    
    try {
      logger.info({
        message: 'Handling logout request',
        userId,
        requestId
      });
      
      const response = await axios({
        method: 'POST',
        url: `${normalizedAuthUrl}/api/auth/logout`,
        data: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Authorization': req.headers['authorization'],
          'X-Service-Name': 'api-gateway',
          'X-Request-ID': requestId
        }
      });

      if (response.data.success && userId && token) {
        await authCache.handleUserLogout(userId, token);
        logger.info(`Invalidated cache for user ${userId}`);
      }
      
      // Forward response to client
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      });
      
      res.status(response.status).send(response.data);
    } catch (error) {
      logger.error({
        message: `Logout error: ${error.message}`,
        requestId
      });
      
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;
      
      res.status(statusCode).json({
        success: false,
        message: 'Logout failed',
        error: errorMessage
      });
    }
  });
  
  // Helper function to normalize URLs
  const normalizeUrl = (url) => {
    if (!url) {
      logger.error('Invalid service URL provided');
      return 'http://localhost:6969';
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  // Generic handler function for forwarding requests
  const createServiceHandler = (serviceUrl, serviceName) => {
    const normalizedUrl = normalizeUrl(serviceUrl);
    
    return async (req, res) => {
      const startTime = Date.now();
      const requestId = req.id || 'unknown';
      
      try {
        logger.info({
          message: 'Forwarding request',
          method: req.method,
          path: req.originalUrl,
          service: serviceName,
          requestId,
          body: req.body,
          headers: req.headers
        });
        
        // Forward the request to the actual service
        const response = await axios({
          method: req.method,
          url: `${normalizedUrl}${req.originalUrl}`,
          data: req.body,
          headers: {
            // Only forward necessary headers to avoid conflicts
            'Content-Type': req.headers['content-type'] || 'application/json',
            'Authorization': req.headers['authorization'],
            'X-Service-Name': 'api-gateway',
            'X-Request-ID': requestId,
            'X-Skip-Rate-Limit': 'true',
            // Essential for proper client IP tracking behind proxy
            'X-Forwarded-For': req.ip,
            'X-Forwarded-Host': req.headers.host,
            'X-Forwarded-Proto': req.protocol
          },
          params: req.query,
          timeout: 15000 // 15 seconds timeout
        });
        
        // Set all headers from the service response
        Object.entries(response.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'transfer-encoding') { // Skip problematic headers
            res.setHeader(key, value);
          }
        });
        
        // Add custom header to identify source service
        res.setHeader('X-Served-By', serviceName);
        
        // Send the response with the same status code
        res.status(response.status).send(response.data);
        
        logger.debug({
          message: 'Request completed',
          latency: `${Date.now() - startTime}ms`,
          status: response.status,
          service: serviceName,
          requestId
        });
      } catch (error) {
        const statusCode = error.response?.status || 502;
        const errorMessage = error.response?.data?.message || error.message;
        
        logger.error({
          message: `Service error: ${errorMessage}`,
          service: serviceName,
          status: statusCode,
          error: error.message,
          requestId
        });
        
        // Send appropriate error response
        res.status(statusCode).json({
          success: false,
          message: 'Service temporarily unavailable',
          service: serviceName,
          error: errorMessage
        });
      }
    };
  };
  
  const setupServiceRoutes = (basePath, serviceUrl, serviceName) => {
    // Create handler for this service
    const handler = createServiceHandler(serviceUrl, serviceName);
    
    // Mount the handler directly
    app.use(basePath, handler);
    
    logger.info(`Registered direct handler for ${basePath} → ${serviceUrl}`);
  };
  
  // Setup all service routes
  setupServiceRoutes('/api/auth', process.env.AUTH_SERVICE_URL, 'auth');
  setupServiceRoutes('/api/users', process.env.AUTH_SERVICE_URL, 'auth');
  setupServiceRoutes('/api/divisions', process.env.AUTH_SERVICE_URL, 'auth');
  setupServiceRoutes('/api/email', process.env.EMAIL_SERVICE_URL, 'email');
  setupServiceRoutes('/api/meetings', process.env.MEETING_SERVICE_URL, 'meeting');
  setupServiceRoutes('/api/trainings', process.env.TRAINING_SERVICE_URL, 'training');
  setupServiceRoutes('/api/aspirasi', process.env.ASPIRASI_SERVICE_URL, 'aspirasi');
  setupServiceRoutes('/api/presence', process.env.PRESENCE_SERVICE_URL, 'presence');
  setupServiceRoutes('/api/progress', process.env.PROGRESS_SERVICE_URL, 'progress');
  
  // Get all users (KADIV only)
  app.get('/api/users', async (req, res) => {
    const normalizedAuthUrl = normalizeUrl(process.env.AUTH_SERVICE_URL);
    const requestId = req.id || 'unknown';
    const token = req.headers.authorization?.split(' ')[1];
    
    try {
      logger.info({
        message: 'Handling get all users request',
        requestId
      });
      
      const response = await axios({
        method: 'GET',
        url: `${normalizedAuthUrl}/api/users`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers['authorization'],
          'X-Service-Name': 'api-gateway',
          'X-Request-ID': requestId
        }
      });
      
      // Forward response to client
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      });
      
      res.status(response.status).send(response.data);
    } catch (error) {
      logger.error({
        message: `Get all users error: ${error.message}`,
        requestId
      });
      
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to get users',
        error: errorMessage
      });
    }
  });
  
  // Add debug routes
  app.get('/debug/service/:name', async (req, res) => {
    const { name } = req.params;
    let serviceUrl;
    
    switch (name.toLowerCase()) {
      case 'auth': serviceUrl = process.env.AUTH_SERVICE_URL; break;
      case 'email': serviceUrl = process.env.EMAIL_SERVICE_URL; break;
      case 'meeting': serviceUrl = process.env.MEETING_SERVICE_URL; break;
      case 'training': serviceUrl = process.env.TRAINING_SERVICE_URL; break;
      case 'aspirasi': serviceUrl = process.env.ASPIRASI_SERVICE_URL; break;
      case 'presence': serviceUrl = process.env.PRESENCE_SERVICE_URL; break;
      case 'progress': serviceUrl = process.env.PROGRESS_SERVICE_URL; break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown service: ${name}`
        });
    }
    
    res.json({
      success: true,
      service: name,
      url: serviceUrl
    });
  });
};

module.exports = createDirectHandlers;