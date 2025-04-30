const axios = require('axios');
const logger = require('../logger');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';

let serviceToken = null;
let tokenExpiry = null;

/**
 * Get fresh service token dengan cache
 */
const getServiceToken = async (forceRefresh = false) => {
  try {
    // Jika token masih valid dalam 5 menit ke depan, gunakan cache
    const now = Date.now();
    if (!forceRefresh && serviceToken && tokenExpiry && now < tokenExpiry - 300000) {
      return serviceToken;
    }
    
    logger.info('Requesting fresh service token from Auth Service');
    
    // Service credentials
    const response = await axios.post(
      `${authServiceUrl}/api/auth/service-token`,
      {
        service_name: 'training-service',
        service_key: process.env.SERVICE_API_KEY || 'training-service-secret-key'
      },
      { timeout: 5000 }
    );
    
    if (response.data && response.data.token) {
      serviceToken = response.data.token;
      // Set token expiry to 55 minutes (assuming 1 hour token)
      tokenExpiry = now + 55 * 60 * 1000;
      logger.info('Service token retrieved successfully');
      return serviceToken;
    }
    
    logger.warn(`Failed to get service token: ${JSON.stringify(response.data)}`);
    return null;
  } catch (error) {
    logger.error(`Error getting service token: ${error.message}`);
    
    // Retry with service login endpoint if the first method failed
    try {
      logger.info('Trying alternative service authentication endpoint');
      const altResponse = await axios.post(
        `${authServiceUrl}/api/auth/service-login`,
        {
          service_key: process.env.SERVICE_API_KEY || 'training-service-secret-key'
        },
        {
          headers: {
            'x-service-name': 'training-service',
            'x-skip-rate-limit': 'true'
          },
          timeout: 5000
        }
      );
      
      if (altResponse.data && altResponse.data.token) {
        serviceToken = altResponse.data.token;
        // Set token expiry to 55 minutes
        tokenExpiry = Date.now() + 55 * 60 * 1000;
        logger.info('Service token retrieved via alternative method');
        return serviceToken;
      }
    } catch (altError) {
      logger.error(`Alternative service auth also failed: ${altError.message}`);
    }
    
    return null;
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

/**
 * Get user email by ID
 */
const getUserEmail = async (userId) => {
  const user = await getUserById(userId);
  if (user && user.email) {
    return user.email;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    const mockEmail = `user-${userId.substring(0, 8)}@example.com`;
    logger.warn(`Using mock email for ${userId} in development mode: ${mockEmail}`);
    return mockEmail;
  }
  
  return null;
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

/**
 * Get user data with email by ID
 */
const getUserById = async (userId) => {
  if (!userId) {
    logger.warn('Attempted to get user for undefined userId');
    return null;
  }
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const token = await getServiceToken(attempt > 1);
      
      if (!token) {
        logger.error('Failed to get service token, cannot proceed with user lookup');
        // Wait before retry
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      
      logger.info(`Fetching user data for userId: ${userId} (attempt ${attempt})`);
      
      // Try multiple auth headers to support different auth implementations
      const response = await axios.get(
        `${authServiceUrl}/api/users/${userId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-service-key': process.env.SERVICE_API_KEY || 'training-service-secret-key',
            'x-service-name': 'training-service'
          },
          timeout: 5000
        }
      );
      
      // Log response for debugging
      logger.debug(`User data response: ${JSON.stringify(response.data)}`);
      
      if (response.data && response.data.success && response.data.user) {
        return response.data.user;
      }
      
      // Alternative format
      if (response.data && response.data.email) {
        return {
          id: userId,
          email: response.data.email
        };
      }
      
      logger.warn(`Unexpected user data format: ${JSON.stringify(response.data)}`);
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`Using mock user data for ${userId} in development mode`);
        return {
          id: userId,
          email: `user-${userId.substring(0, 8)}@example.com`,
          namaLengkap: `User ${userId.substring(0, 8)}`
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error fetching user (attempt ${attempt}): ${error.message}`);
      
      // Log more details for debugging
      if (error.response) {
        logger.error(`Response details: Status=${error.response.status}, Data=${JSON.stringify(error.response.data)}`);
      }
      
      // Wait before retry
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return null;
};

/**
 * Get division details by ID
 * @param {Number} divisionId Division ID
 * @returns {Promise<Object|null>} Division details or null
 */
const getDivisionDetails = async (divisionId) => {
  try {
    // Get token for service calls
    const token = await getServiceToken();
    
    const response = await axios.get(
      `${authServiceUrl}/api/divisions/${divisionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-service-name': 'training-service'
        },
        timeout: 5000
      }
    );
    
    if (response.data && response.data.success) {
      return response.data.division;
    }
    return null;
  } catch (error) {
    logger.error(`Error getting division details: ${error.message}`);
    return null;
  }
};

module.exports = {
  getServiceToken,
  isUserKadiv,
  isUserInDivisionWithRole,
  getUsersByDivision,
  getUserEmail,
  getBulkUserEmails,
  getUserById,
  getDivisionDetails
};