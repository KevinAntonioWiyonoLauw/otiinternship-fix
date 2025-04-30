const axios = require('axios');
const logger = require('../logger');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

// Check if user is a Kadiv HD
const isUserKadivHD = async (userId, token) => {
  try {
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}/divisions`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Log the response to see its structure
    logger.info(`User roles response: ${JSON.stringify(response.data)}`);

    // The API returns "divisions" array instead of "roles"
    const divisions = response.data.divisions || [];

    // Use "name" instead of "division_name" to match the API response
    const isKadivHD = divisions.some(div =>
      div.name === 'HD' && div.role === 'KADIV'
    );

    logger.info(`IsKadivHD result: ${isKadivHD}, User ID: ${userId}`);

    return isKadivHD;
  } catch (error) {
    logger.error(`Error checking Kadiv HD status: ${error.message}`);
    return false;
  }
};

// Verify user exists
const verifyUser = async (userId, token) => {
  try {
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.user || null;
  } catch (error) {
    logger.error(`Error verifying user: ${error.message}`);
    return null;
  }
};

// Get service token
const getServiceToken = async () => {
  try {
    const response = await axios.post(`${authServiceUrl}/api/auth/service-login`, {
      service_key: process.env.SERVICE_AUTH_KEY || 'aspirasi-service-secret-key'
    }, {
      headers: {
        'x-service-name': 'aspirasi-service',
        'x-skip-rate-limit': 'true'
      }
    });

    if (response.data && response.data.token) {
      return response.data.token;
    }

    throw new Error('Failed to get service token');
  } catch (error) {
    logger.error(`Error getting service token: ${error.message}`);
    throw error;
  }
};

module.exports = {
  isUserKadivHD,
  verifyUser,
  getServiceToken
};