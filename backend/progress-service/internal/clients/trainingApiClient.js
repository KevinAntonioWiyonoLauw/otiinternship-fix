const axios = require('axios');
const logger = require('../logger');

const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://training-service-api:8004';

/**
 * Get total number of trainings for a division
 * @param {string} token - Auth token
 * @param {number} divisionId - Division ID
 * @returns {Promise<number>} Total number of trainings
 */
const getTotalTrainingsCount = async (token, divisionId) => {
  try {
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/count/division/${divisionId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      }
    );
    
    return response.data.count || 0;
  } catch (error) {
    logger.error(`Error getting total trainings count: ${error.message}`);
    return 0;
  }
};

/**
 * Get number of completed trainings for a division
 * @param {string} token - Auth token
 * @param {number} divisionId - Division ID
 * @returns {Promise<number>} Number of completed trainings
 */
const getCompletedTrainingsCount = async (token, divisionId) => {
  try {
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/completed/division/${divisionId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      }
    );
    
    return response.data.count || 0;
  } catch (error) {
    logger.error(`Error getting completed trainings count: ${error.message}`);
    return 0;
  }
};

module.exports = {
  getTotalTrainingsCount,
  getCompletedTrainingsCount
}; 