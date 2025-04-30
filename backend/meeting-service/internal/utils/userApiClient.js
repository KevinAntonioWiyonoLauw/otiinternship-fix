const axios = require('axios');
const logger = require('../logger');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';

let cachedServiceToken = null;
let tokenExpiry = null;

// Get service token with retry
const getServiceToken = async () => {
  try {
    const response = await axios.post(`${authServiceUrl}/api/auth/service-login`, {
      service_key: process.env.SERVICE_AUTH_KEY || 'meeting-service-secret-key'
    }, {
      headers: {
        'x-service-name': 'meeting-service',
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

const isUserKadiv = async (userId, divisionId = null) => {
  try {
    const serviceToken = await getServiceToken();
    
    // Get user's divisions with detailed information
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}/divisions`,
      { headers: { Authorization: `Bearer ${serviceToken}` } }
    );
    
    logger.info(`Division check response for ${userId}: ${JSON.stringify(response.data)}`);
    
    if (!response.data || !response.data.success) {
      logger.warn(`Failed to get divisions for user ${userId}`);
      return false;
    }
    
    const divisions = response.data.divisions || [];
    
    // HD Kadiv is considered super admin
    const isHdKadiv = divisions.some(div => 
      (div.division_id === 16 || div.id === 16) && 
      div.role === 'KADIV'
    );
    
    // If checking for specific division
    if (divisionId !== null) {
      const isSpecificDivKadiv = divisions.some(div => 
        (div.division_id === parseInt(divisionId) || div.id === parseInt(divisionId)) && 
        div.role === 'KADIV'
      );
      
      // Return true if either KADIV of requested division or KADIV HD
      return isSpecificDivKadiv || isHdKadiv;
    }
    
    // Otherwise check if KADIV of any division
    return divisions.some(div => div.role === 'KADIV');
  } catch (error) {
    logger.error(`Error checking if user is KADIV: ${error.message}`);
    return false;
  }
};

const isUserInDivisionWithRole = async (userId, divisionId, role) => {
  try {
    const serviceToken = await getServiceToken();
    
    // Get user's divisions
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}/divisions`,
      { headers: { Authorization: `Bearer ${serviceToken}` } }
    );
    
    logger.info(`Role check response for ${userId} in division ${divisionId}: ${JSON.stringify(response.data)}`);
    
    if (!response.data || !response.data.success) {
      return false;
    }
    
    const divisions = response.data.divisions || [];
    
    // Check if user has specified role in specified division
    return divisions.some(div => 
      (div.division_id === parseInt(divisionId) || div.id === parseInt(divisionId)) && 
      div.role === role
    );
  } catch (error) {
    logger.error(`Error checking if user is ${role} in division ${divisionId}: ${error.message}`);
    return false;
  }
};

// Get users by division
const getUsersByDivision = async (divisionId) => {
  try {
    const serviceToken = await getServiceToken();
    logger.info(`Fetching users for division ${divisionId}`);
    
    const response = await axios.get(
      `${authServiceUrl}/api/divisions/${divisionId}/users`,
      { headers: { Authorization: `Bearer ${serviceToken}` } }
    );
    
    // Log untuk debugging
    logger.info(`Division users response: ${JSON.stringify(response.data)}`);
    
    if (response.data && response.data.success) {
      // Cek apakah users ada di response.data.users atau langsung di response.data
      const users = response.data.users || [];
      
      // Jika array kosong, coba cek format alternatif
      if (users.length === 0 && Array.isArray(response.data)) {
        return response.data;
      }
      
      logger.info(`Retrieved ${users.length} users from Auth Service for division ${divisionId}`);
      return users;
    }
    
    // Coba format response alternatif
    if (Array.isArray(response.data)) {
      logger.info(`Retrieved ${response.data.length} users from Auth Service (alternative format) for division ${divisionId}`);
      return response.data;
    }
    
    logger.warn(`Auth Service returned unexpected response format for division ${divisionId}: ${JSON.stringify(response.data)}`);
    return [];
  } catch (error) {
    logger.error(`Error getting users by division ${divisionId}: ${error.message}`);
    return [];
  }
};

// Get user email by ID
const getUserEmail = async (userId) => {
  try {
    const serviceToken = await getServiceToken();
    
    logger.info(`Fetching email for user ${userId}`);
    
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}`,
      { headers: { Authorization: `Bearer ${serviceToken}` } }
    );
    
    // Log untuk debugging
    logger.debug(`User data response: ${JSON.stringify(response.data)}`);
    
    if (response.data && response.data.success && response.data.user) {
      logger.info(`Retrieved email for user ${userId}: ${response.data.user.email}`);
      return response.data.user.email;
    }
    
    // Format alternatif respons
    if (response.data && response.data.email) {
      logger.info(`Retrieved email (alternative format) for user ${userId}: ${response.data.email}`);
      return response.data.email;
    }
    
    logger.warn(`Could not find email for user ${userId} in response: ${JSON.stringify(response.data)}`);
    return null;
  } catch (error) {
    logger.error(`Error getting user email: ${error.message}`);
    
    // Untuk testing, return alamat email dummy
    if (process.env.NODE_ENV === 'development') {
      const mockEmail = `user-${userId.substring(0, 8)}@example.com`;
      logger.warn(`Development mode: Using mock email for user ${userId}: ${mockEmail}`);
      return mockEmail;
    }
    
    return null;
  }
};

// Get multiple user emails in one request
const getBulkUserEmails = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return {};
  }
  
  try {
    // Try using userApiClient first
    try {
      return await userApiClient.getBulkUserEmails(userIds);
    } catch (e) {
      logger.warn(`userApiClient.getBulkUserEmails failed: ${e.message}, using fallback`);
    }
    
    // Fallback implementation
    const serviceToken = await getServiceToken();
    
    // Request bulk emails from Auth Service
    const response = await axios.post(
      `${authServiceUrl}/api/users/bulk-emails`,
      { user_ids: userIds },
      {
        headers: { Authorization: `Bearer ${serviceToken}` },
        timeout: 5000 // Add timeout
      }
    );
    
    if (response.data && response.data.success && response.data.emails) {
      return response.data.emails;
    }
    
    // Alternative response format check
    if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
      // If response directly contains user_id -> email mapping
      return response.data;
    }
    
    logger.warn(`Bulk email fetch returned unexpected format: ${JSON.stringify(response.data)}`);
    return {};
  } catch (error) {
    logger.error(`Error getting bulk user emails: ${error.message}`);
    return {};
  }
};

module.exports = {
  getServiceToken,
  isUserKadiv,
  isUserInDivisionWithRole,
  getUsersByDivision,
  getUserEmail,
  getBulkUserEmails,
};