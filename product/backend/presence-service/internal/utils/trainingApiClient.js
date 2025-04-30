const axios = require('axios');
const logger = require('../logger');

const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://training-service-api:8004';
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';

// Cache service token to reduce auth requests
let cachedServiceToken = null;
let tokenExpiry = null;

// Circuit breaker implementation
let circuitState = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30000; // 30 seconds

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
      timeout: 5000 // Add timeout
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
 * Check if a training exists and is valid for presence
 * @param {number} trainingId - Training ID to check
 * @param {string} token - User auth token or service token
 * @returns {Promise<Object>} - Training details
 */
const checkTrainingValidity = async (trainingId, token) => {
  // Check circuit state
  if (circuitState === 'OPEN') {
    // Check if it's time to try again
    if (Date.now() - lastFailureTime > RESET_TIMEOUT) {
      circuitState = 'HALF-OPEN';
      logger.info('Circuit breaker switched to HALF-OPEN state');
    } else {
      logger.warn('Circuit breaker is OPEN, not making request to training service');
      throw new Error('Training service temporarily unavailable');
    }
  }
  
  try {
    // Ensure valid token (use user token if provided, otherwise get service token)
    const authToken = token || await getServiceToken();
    
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/${trainingId}`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'x-service-name': 'presence-service'
        },
        timeout: 5000 // Add timeout
      }
    );
    
    if (!response.data || !response.data.success || !response.data.training) {
      throw new Error('Training not found or invalid');
    }
    
    // Reset circuit breaker on success
    if (circuitState !== 'CLOSED') {
      circuitState = 'CLOSED';
      failureCount = 0;
      logger.info('Circuit breaker reset to CLOSED state');
    }
    
    return response.data.training;
  } catch (error) {
    // Handle circuit breaker logic
    failureCount++;
    lastFailureTime = Date.now();
    
    if (failureCount >= FAILURE_THRESHOLD && circuitState === 'CLOSED') {
      circuitState = 'OPEN';
      logger.warn(`Circuit breaker opened after ${failureCount} failures`);
    }
    
    if (error.response && error.response.status === 404) {
      throw new Error('Training not found');
    }
    
    logger.error(`Error checking training validity: ${error.message}`);
    throw error;
  }
};

/**
 * Check if user is a participant in the training
 * @param {number} trainingId - Training ID
 * @param {string} userId - User ID
 * @param {string} token - User auth token or service token
 * @returns {Promise<boolean>} - True if user is participant
 */
const checkUserParticipation = async (trainingId, userId, token) => {
  try {
    // Ensure valid token
    const authToken = token || await getServiceToken();
    
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/${trainingId}/participants`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'x-service-name': 'presence-service'
        },
        timeout: 5000 // Add timeout
      }
    );
    
    if (!response.data || !response.data.success) {
      throw new Error('Failed to get training participants');
    }
    
    const participants = response.data.training?.participants || [];
    
    // Check different possible participant user ID formats
    return participants.some(p => 
      p.user_id === userId || 
      p.userId === userId || 
      p.id === userId
    );
  } catch (error) {
    logger.error(`Error checking user participation: ${error.message}`);
    throw error;
  }
};

/**
 * Check if user is a Kadiv (for permission to record manual presence)
 * @param {string} userId - User ID
 * @param {string} token - User auth token or service token
 * @returns {Promise<boolean>} - True if user is Kadiv
 */
const isUserKadiv = async (userId, token) => {
  try {
    // Ensure valid token
    const authToken = token || await getServiceToken();
    
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/check-kadiv/${userId}`,
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'x-service-name': 'presence-service' 
        },
        timeout: 5000 // Add timeout
      }
    );
    
    return response.data && response.data.success && response.data.isKadiv === true;
  } catch (error) {
    logger.error(`Error checking Kadiv status: ${error.message}`);
    // Default to false on error for security
    return false;
  }
};

/**
 * Check if current time is within training session time
 * @param {Object} training - Training object with date, start_time, end_time
 * @returns {boolean} - True if current time is within training session
 */
const isWithinTrainingTime = (training) => {
  if (!training || !training.date || !training.start_time || !training.end_time) {
    return false;
  }

  const now = new Date();
  const trainingDate = new Date(training.date);
  
  // Parse start_time and end_time (format like "14:30:00")
  const [startHours, startMinutes] = training.start_time.split(':').map(Number);
  const [endHours, endMinutes] = training.end_time.split(':').map(Number);
  
  // Create Date objects for start and end times
  const trainingStart = new Date(trainingDate);
  trainingStart.setHours(startHours, startMinutes, 0, 0);
  
  const trainingEnd = new Date(trainingDate);
  trainingEnd.setHours(endHours, endMinutes, 0, 0);
  
  // Check if now is between start and end times
  return now >= trainingStart && now <= trainingEnd;
};

/**
 * Validate QR presence timing
 * @param {number} trainingId - Training ID
 * @param {string} token - Auth token
 * @returns {Promise<{valid: boolean, training: Object, message: string}>} - Validation result
 */
const validateQrPresenceTiming = async (trainingId, token) => {
  try {
    const training = await checkTrainingValidity(trainingId, token);
    
    if (isWithinTrainingTime(training)) {
      return {
        valid: true,
        training,
        message: 'QR presence is allowed during training session'
      };
    }
    
    return {
      valid: false,
      training,
      message: 'QR presence can only be recorded during the training session'
    };
  } catch (error) {
    logger.error(`Error validating QR presence timing: ${error.message}`);
    throw error;
  }
};

/**
 * Get division ID for a training
 * @param {number} trainingId - Training ID
 * @param {string} token - Auth token
 * @returns {Promise<number|null>} - Division ID
 */
const getTrainingDivision = async (trainingId, token) => {
  try {
    const training = await checkTrainingValidity(trainingId, token);
    return training.divisionId || training.division_id || null;
  } catch (error) {
    logger.error(`Error getting training division: ${error.message}`);
    return null;
  }
};

/**
 * Get circuit breaker status for monitoring
 * @returns {Object} - Circuit breaker status
 */
const getCircuitStatus = () => {
  return {
    state: circuitState,
    failureCount,
    lastFailureTime: lastFailureTime ? new Date(lastFailureTime).toISOString() : null,
    threshold: FAILURE_THRESHOLD,
    resetTimeout: RESET_TIMEOUT,
    resetTimeRemaining: circuitState === 'OPEN' ? 
      Math.max(0, RESET_TIMEOUT - (Date.now() - lastFailureTime)) : 0
  };
};

/**
 * Check if user has role in division
 * @param {string} userId - User ID to check
 * @param {number} divisionId - Division ID to check (16 for HD)
 * @param {string} role - Role to check (KADIV, STAFF)
 * @param {string} token - User token or null for service token
 * @returns {Promise<boolean>} - True if user has role in division
 */
const isUserInDivisionWithRole = async (userId, divisionId, role, token = null) => {
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
    
    // Log response for debugging
    logger.info(`Division check response for user ${userId}: ${JSON.stringify(response.data)}`);
    
    if (!response.data || !response.data.success) {
      logger.warn(`Failed to get divisions for user ${userId}`);
      return false;
    }
    
    const divisions = response.data.divisions || [];
    
    // Check if user has specified role in specified division
    return divisions.some(div => 
      (div.id === parseInt(divisionId)) && 
      div.role === role
    );
  } catch (error) {
    logger.error(`Error checking user division role: ${error.message}`);
    return false;
  }
};

/**
 * Get training details from Training Service
 * @param {Number} trainingId - Training ID
 * @param {String} token - JWT token
 * @returns {Promise<Object>} Training details
 */
const getTrainingDetails = async (trainingId, token) => {
  try {
    // Get service token if one is not provided
    const serviceToken = token || await getServiceToken();
    
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/${trainingId}`,
      { 
        headers: { 
          Authorization: `Bearer ${serviceToken}`,
          'x-source-service': 'presence-service'
        },
        timeout: 5000
      }
    );
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Failed to get training details');
    }
    
    // Ensure we have the required fields for time validation
    const training = response.data.training;
    
    // Log raw data for debugging time formats
    logger.debug(`Raw training data from API: date=${training.date}, start_time=${training.start_time}, end_time=${training.end_time}`);
    
    if (!training.date || !training.start_time || !training.end_time) {
      logger.warn(`Training ${trainingId} is missing required time fields: date=${training.date}, start_time=${training.start_time}, end_time=${training.end_time}`);
    }
    
    return training;
  } catch (error) {
    logger.error(`Error getting training details: ${error.message}`);
    
    if (error.response && error.response.status === 404) {
      throw new Error('Training not found');
    }
    
    throw error;
  }
};

/**
 * Get total count of trainings, optionally filtered by division
 * @param {string} token Auth token
 * @param {number} divisionId Optional division ID to filter by
 * @returns {Promise<number>} Total number of trainings
 */
const getTotalTrainingsCount = async (token, divisionId = null) => {
  try {
    let url = `${trainingServiceUrl}/api/trainings/count`;
    
    // If division ID is provided, use the division-specific endpoint
    if (divisionId) {
      url = `${trainingServiceUrl}/api/trainings/count/division/${divisionId}`;
    }
    
    const response = await axios.get(
      url,
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      }
    );
    
    return response.data.count || 0;
  } catch (error) {
    logger.error(`Error getting total training count: ${error.message}`);
    return 0;
  }
};

module.exports = {
  checkTrainingValidity,
  checkUserParticipation,
  isUserKadiv,
  isWithinTrainingTime,
  validateQrPresenceTiming,
  getTrainingDivision,
  getServiceToken,
  getCircuitStatus,
  isUserInDivisionWithRole,
  getTrainingDetails,
  getTotalTrainingsCount
};