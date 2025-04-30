const prisma = require('../../db');
const logger = require('../logger');
const axios = require('axios');

// Cache untuk record kehadiran yang sering diakses
const presenceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

/**
 * Record a new presence entry
 * @param {Object} presenceData - Data for the presence record
 * @returns {Promise<Object>} - The created presence record
 */
const recordPresence = async (presenceData) => {
  try {
    const { training_id, user_id, presence_type } = presenceData;
    
    // Gunakan Prisma untuk mencatat kehadiran dengan upsert untuk menghindari duplikat
    const result = await prisma.presence.upsert({
      where: {
        trainingId_userId: {
          trainingId: training_id,
          userId: user_id
        }
      },
      update: {}, // Tidak mengubah apapun jika sudah ada
      create: {
        trainingId: training_id,
        userId: user_id,
        presenceType: presence_type
      }
    });
    
    // Invalidate cache after presence is recorded
    invalidatePresenceCache(training_id, user_id);
    
    return result;
  } catch (error) {
    logger.error(`Error recording presence: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a user is already present for a training
 * @param {number} training_id - Training ID
 * @param {string} user_id - User ID
 * @returns {Promise<Object|null>} - Presence record if exists, null otherwise
 */
const checkPresence = async (training_id, user_id) => {
  try {
    return await getCachedPresence(training_id, user_id);
  } catch (error) {
    logger.error(`Error checking presence: ${error.message}`);
    throw error;
  }
};

/**
 * Get cached presence data or fetch from database
 * @param {number} training_id - Training ID
 * @param {string} user_id - User ID
 */
const getCachedPresence = async (training_id, user_id) => {
  try {
    // Add null/undefined check before parsing
    if (!training_id) {
      throw new Error(`Missing required parameter: training_id`);
    }
    
    // Convert training_id to numeric value to ensure it's an integer
    const numericTrainingId = parseInt(training_id, 10);
    
    if (isNaN(numericTrainingId)) {
      throw new Error(`Invalid training ID format: ${training_id}`);
    }
    
    const cacheKey = `${numericTrainingId}_${user_id}`;
    
    // Check cache first
    if (presenceCache.has(cacheKey)) {
      const cachedData = presenceCache.get(cacheKey);
      if (Date.now() < cachedData.expiresAt) {
        logger.debug('Using cached presence data');
        return cachedData.data;
      }
      presenceCache.delete(cacheKey); // Remove expired cache
    }
    
    // Fetch from database if not in cache
    const result = await prisma.presence.findUnique({
      where: {
        trainingId_userId: {
          trainingId: numericTrainingId,
          userId: user_id
        }
      }
    });
    
    // Cache the result
    if (result) {
      presenceCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL
      });
    }
    
    return result;
  } catch (error) {
    logger.error(`Error in getCachedPresence: ${error.message}`);
    throw error;
  }
};

/**
 * Invalidate cache for a specific presence record
 * @param {number} training_id - Training ID
 * @param {string} user_id - User ID
 */
const invalidatePresenceCache = (training_id, user_id) => {
  const cacheKey = `${training_id}_${user_id}`;
  presenceCache.delete(cacheKey);
};

/**
 * Get training details from the Training Service API
 * @param {number} training_id - Training ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Training details
 */
const getTrainingDetails = async (training_id, token) => {
  try {
    const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://training-service-api:8004';
    
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/${training_id}`,
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-service-name': 'presence-service',
          'x-skip-rate-limit': 'true'
        },
        timeout: 5000 // Add timeout
      }
    );
    
    if (response.data && response.data.success) {
      return response.data.training;
    }
    
    throw new Error('Failed to fetch training details');
  } catch (error) {
    logger.error(`Error getting training details: ${error.message}`);
    throw error;
  }
};

/**
 * Get all presence records for a training
 * @param {number} training_id - Training ID
 * @returns {Promise<Array>} - List of presence records
 */
const getPresenceByTraining = async (training_id) => {
  try {
    return await prisma.presence.findMany({
      where: {
        trainingId: training_id
      },
      orderBy: {
        timestamp: 'asc'
      }
    });
  } catch (error) {
    logger.error(`Error getting presence by training: ${error.message}`);
    throw error;
  }
};

/**
 * Get all presence records for a user
 * @param {string} user_id - User ID
 * @returns {Promise<Array>} - List of presence records
 */
const getPresenceByUser = async (user_id) => {
  try {
    return await prisma.presence.findMany({
      where: {
        userId: user_id
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting presence by user: ${error.message}`);
    throw error;
  }
};

/**
 * Get presence statistics for a training
 * @param {number} training_id - Training ID
 * @returns {Promise<Object>} - Presence statistics
 */
const getPresenceStatistics = async (training_id) => {
  try {
    // Get all presence records for the training
    const presenceRecords = await prisma.presence.findMany({
      where: {
        trainingId: training_id
      }
    });
    
    // Count by type
    const qrCount = presenceRecords.filter(p => p.presenceType === 'QR').length;
    const manualCount = presenceRecords.filter(p => p.presenceType === 'Manual').length;
    
    return {
      total: presenceRecords.length,
      qr_count: qrCount,
      manual_count: manualCount,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Error getting presence statistics: ${error.message}`);
    throw error;
  }
};

module.exports = {
  recordPresence,
  checkPresence,
  getCachedPresence,
  getTrainingDetails,
  getPresenceByTraining,
  getPresenceByUser,
  getPresenceStatistics
};