const axios = require('axios');
const logger = require('../logger');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';

// Cache service token to reduce auth requests
let cachedServiceToken = null;
let tokenExpiry = null;

/**
 * Get service token for service-to-service communication
 * @returns {Promise<string>} - Service auth token
 */
const getServiceToken = async () => {
  try {
    // Return cached token if it exists and is not expired
    const now = Date.now();
    if (cachedServiceToken && tokenExpiry && tokenExpiry > now) {
      return cachedServiceToken;
    }

    // Get new token
    const response = await axios.post(`${authServiceUrl}/api/auth/service-login`, {
      service_key: process.env.SERVICE_AUTH_KEY || 'presence-service-secret-key'
    }, {
      headers: {
        'x-service-name': 'presence-service',
        'x-skip-rate-limit': 'true'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.token) {
      cachedServiceToken = response.data.token;
      // Set token to expire in 55 minutes (assuming 1 hour validity)
      tokenExpiry = now + (55 * 60 * 1000);
      return cachedServiceToken;
    }
    
    throw new Error('Failed to get service token');
  } catch (error) {
    logger.error(`Error getting service token: ${error.message}`);
    // If we have a cached token, use it even if expired in emergency
    if (cachedServiceToken) {
      logger.warn('Using expired token as fallback');
      return cachedServiceToken;
    }
    throw error;
  }
};

/**
 * Get user's divisions from auth service
 * @param {string} userId - User ID
 * @param {string} token - Auth token or null for service token
 * @returns {Promise<Array>} - Array of user's divisions
 */
const getUserDivisions = async (userId, token = null) => {
  try {
    // Get token - either use provided token or get service token
    const authToken = token || await getServiceToken();
    
    // Get user's divisions directly from auth service
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}/divisions`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'x-service-name': 'presence-service',
          'x-skip-rate-limit': 'true'
        },
        timeout: 3000
      }
    );
    
    if (!response.data || !response.data.success) {
      logger.warn(`Failed to get divisions for user ${userId}`);
      return [];
    }
    
    return response.data.divisions || [];
  } catch (error) {
    logger.error(`Error getting user divisions: ${error.message}`);
    return [];
  }
};

/**
 * Get user email from auth service
 * @param {string} userId - User ID
 * @param {string} token - Auth token or null for service token
 * @returns {Promise<string|null>} - User email or null
 */
const getUserEmail = async (userId, token = null) => {
  try {
    // Get token - either use provided token or get service token
    const authToken = token || await getServiceToken();
    
    // Get user details from auth service
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'x-service-name': 'presence-service',
          'x-skip-rate-limit': 'true'
        },
        timeout: 3000
      }
    );
    
    if (!response.data || !response.data.success || !response.data.user) {
      logger.warn(`Failed to get user details for user ${userId}`);
      return null;
    }
    
    return response.data.user.email || null;
  } catch (error) {
    logger.error(`Error getting user email: ${error.message}`);
    return null;
  }
};

module.exports = {
  getUserDivisions,
  getUserEmail,
  getServiceToken
}; 