const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const logger = require('../logger');

// Middleware to authenticate JWT tokens
const authenticateJWT = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('JWT verification failed:', error);
        return res.status(403).json({ message: 'Invalid token.' });
    }
};

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
      req.token = token;
      
      next();
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      
      return res.status(403).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  };

module.exports = {
    authenticateJWT,
    authMiddleware,
};