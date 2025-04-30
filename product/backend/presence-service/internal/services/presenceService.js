const presenceRepository = require('../repositories/presenceRepo');
const { verifyQRCode, generateQRCode } = require('../utils/qrCodeUtil');
const trainingApiClient = require('../utils/trainingApiClient');
const logger = require('../logger');

/**
 * Record presence by QR code - WITH TIME VALIDATION
 * @param {string} qrToken - QR token to scan
 * @param {string} userId - User ID
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} - Result of presence recording
 */
const recordPresenceByQR = async (qrToken, userId, authToken) => {
  try {
    // Verify the QR code and extract training ID
    const qrData = verifyQRCode(qrToken);
    const trainingId = qrData.training_id;
    
    // Check if the training is valid
    const training = await trainingApiClient.checkTrainingValidity(trainingId, authToken);
    
    // Check if user is a participant in the training
    const isParticipant = await trainingApiClient.checkUserParticipation(trainingId, userId, authToken);
    
    if (!isParticipant) {
      logger.warn(`User ${userId} attempted to record presence for training ${trainingId} but is not a participant`);
      throw new Error('User is not a participant in this training');
    }
    
    // VALIDATE PRESENCE TIME (QR validation)
    const now = new Date();
    const trainingDate = new Date(training.date);
    
    // Parse start_time and end_time (assuming format like "14:30:00")
    const [startHours, startMinutes] = training.start_time.split(':').map(Number);
    const [endHours, endMinutes] = training.end_time.split(':').map(Number);
    
    // Create Date objects for start and end times on training date
    const trainingStart = new Date(trainingDate);
    trainingStart.setHours(startHours, startMinutes, 0, 0);
    
    const trainingEnd = new Date(trainingDate);
    trainingEnd.setHours(endHours, endMinutes, 0, 0);
    
    // Check if now is between start and end times
    if (now < trainingStart || now > trainingEnd) {
      logger.warn(`User ${userId} attempted QR presence outside of training hours for training ${trainingId}`);
      throw new Error('QR presence can only be recorded during the training session');
    }
    
    // Check if presence is already recorded
    const existingPresence = await presenceRepository.checkPresence(trainingId, userId);
    
    if (existingPresence) {
      logger.info(`Presence already recorded for user ${userId} in training ${trainingId}`);
      return { alreadyRecorded: true, presence: existingPresence };
    }
    
    // Record the presence using Prisma
    const presence = await presenceRepository.recordPresence({
      training_id: trainingId,
      user_id: userId,
      presence_type: 'QR'
    });
    
    logger.info(`QR Presence recorded: User ${userId} for training ${trainingId}`);
    return { alreadyRecorded: false, presence };
  } catch (error) {
    logger.error(`Error in recordPresenceByQR service: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate expiration timestamp based on fixed 15 minutes window
 * @param {Object} training - Training object with date, start_time, end_time
 * @returns {Object} - Object containing timestamp and minutes until end
 */
const calculateExpiryFromTraining = (training) => {
  try {
    const now = new Date();
    
    // Log raw training data for debugging
    logger.debug(`Raw training data: date=${training.date}, start_time=${training.start_time}, end_time=${training.end_time}`);
    
    // Ensure we have valid training.date
    const trainingDate = new Date(training.date);
    if (isNaN(trainingDate.getTime())) {
      logger.error(`Invalid training date: ${training.date}`);
      return { 
        expiryTimestamp: Date.now() + (15 * 60 * 1000), // 15 minutes from now
        minutesUntilEnd: 15,
        expiryDate: new Date(Date.now() + (15 * 60 * 1000))
      };
    }
    
    // Check if we're within the training window
    let startHours = 0, startMinutes = 0;
    let endHours = 0, endMinutes = 0;
    
    // Parse start_time
    if (typeof training.start_time === 'string') {
      [startHours, startMinutes] = training.start_time.split(':').map(Number);
    } else if (training.start_time instanceof Date) {
      startHours = training.start_time.getUTCHours();
      startMinutes = training.start_time.getUTCMinutes();
    }
    
    // Parse end_time
    if (typeof training.end_time === 'string') {
      [endHours, endMinutes] = training.end_time.split(':').map(Number);
    } else if (training.end_time instanceof Date) {
      endHours = training.end_time.getUTCHours();
      endMinutes = training.end_time.getUTCMinutes();
    }
    
    // Create date objects for training start and end times
    const trainingStart = new Date(trainingDate);
    trainingStart.setHours(startHours, startMinutes, 0, 0);
    
    const trainingEnd = new Date(trainingDate);
    trainingEnd.setHours(endHours, endMinutes, 0, 0);
    
    // Log training window for debugging
    logger.debug(`Training window: ${trainingStart.toISOString()} to ${trainingEnd.toISOString()}`);
    logger.debug(`Current time: ${now.toISOString()}`);
    
    // Check if current time is within training window
    const isWithinTraining = (now >= trainingStart && now <= trainingEnd);
    
    if (!isWithinTraining) {
      logger.warn(`Attempted to generate QR code outside training window: now=${now.toISOString()}, training=${trainingStart.toISOString()} to ${trainingEnd.toISOString()}`);
      return {
        isWithinTraining: false,
        trainingStart,
        trainingEnd
      };
    }
    
    // Calculate expiry time (15 minutes from now)
    const expiryDate = new Date(now.getTime() + (15 * 60 * 1000));
    const expiryTimestamp = expiryDate.getTime();
    
    // Cap expiry at training end if it would exceed it
    if (expiryDate > trainingEnd) {
      logger.info(`Capping QR expiry to training end time as 15-min window would exceed training end`);
      const cappedExpiryDate = new Date(trainingEnd);
      const cappedExpiryTimestamp = cappedExpiryDate.getTime();
      const minutesUntilEnd = Math.max(1, Math.floor((cappedExpiryDate - now) / (60 * 1000)));
      
      logger.info(`Setting QR expiry to training end time: ${cappedExpiryDate.toISOString()} (${minutesUntilEnd} minutes from now)`);
      return { 
        expiryTimestamp: cappedExpiryTimestamp, 
        minutesUntilEnd,
        expiryDate: cappedExpiryDate,
        isWithinTraining: true
      };
    }
    
    // Calculate minutes until expiry
    const minutesUntilEnd = 15;
    
    logger.info(`Setting QR expiry to 15 minutes from now: ${expiryDate.toISOString()}`);
    return { 
      expiryTimestamp, 
      minutesUntilEnd, 
      expiryDate,
      isWithinTraining: true
    };
  } catch (error) {
    logger.error(`Error calculating training expiry: ${error.message}`);
    return { 
      expiryTimestamp: Date.now() + (15 * 60 * 1000), 
      minutesUntilEnd: 15,
      expiryDate: new Date(Date.now() + (15 * 60 * 1000)),
      isWithinTraining: true  // Fallback to allow generation
    };
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
 * Record presence manually by Kadiv (NO TIME VALIDATION)
 * @param {number} trainingId - Training ID
 * @param {string} userId - User ID to record presence for
 * @param {string} currentUserId - User ID performing the action (Kadiv)
 * @param {string} authToken - Auth token
 * @returns {Promise<Object>} - Result of presence recording
 */
const recordPresenceManually = async (trainingId, userId, currentUserId, authToken) => {
  try {
    // Cek apakah user adalah Kadiv
    const isKadiv = await trainingApiClient.isUserKadiv(currentUserId, authToken);

    // Cek apakah user adalah Kadiv HD langsung ke auth service
    const isKadivHD = await trainingApiClient.isUserInDivisionWithRole(currentUserId, 16, 'KADIV', authToken);

    if (!isKadiv && !isKadivHD) {
      logger.warn(`User ${currentUserId} attempted to manually record presence but is not a Kadiv or Kadiv HD`);
      throw new Error('Only Kadiv or Kadiv HD can record presence manually');
    }
    
    // Check if the training is valid (still check validity but don't check time)
    await trainingApiClient.checkTrainingValidity(trainingId, authToken);
    
    // Check if the target user is a participant
    const isParticipant = await trainingApiClient.checkUserParticipation(trainingId, userId, authToken);
    
    if (!isParticipant) {
      logger.warn(`User ${userId} is not a participant in training ${trainingId}`);
      throw new Error('User is not a participant in this training');
    }
    
    // Check if presence is already recorded
    const existingPresence = await presenceRepository.checkPresence(trainingId, userId);
    
    if (existingPresence) {
      logger.info(`Presence already recorded for user ${userId} in training ${trainingId}`);
      return { alreadyRecorded: true, presence: existingPresence };
    }
    
    // Record the presence with Prisma - NO TIME VALIDATION for manual entry
    const presence = await presenceRepository.recordPresence({
      training_id: trainingId,
      user_id: userId,
      presence_type: 'Manual'
    });
    
    logger.info(`Manual Presence recorded: User ${userId} for training ${trainingId} by Kadiv ${currentUserId}`);
    return { alreadyRecorded: false, presence };
  } catch (error) {
    logger.error(`Error in recordPresenceManually service: ${error.message}`);
    throw error;
  }
};

/**
 * Record presence with direct type selection
 * @param {Object} presenceData - Presence data including training_id and presence_type
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - Result of presence recording
 */
const recordPresence = async (presenceData, userId, token) => {
  try {
    const { training_id, presence_type } = presenceData;
    
    // Ensure training_id is provided and valid
    if (!training_id) {
      throw new Error('Missing required training_id parameter');
    }
    
    // Check if presence is already recorded
    const existingPresence = await presenceRepository.checkPresence(training_id, userId);
    
    if (existingPresence) {
      logger.info(`Presence already recorded for user ${userId} in training ${training_id}`);
      return { alreadyRecorded: true, presence: existingPresence };
    }
    
    // Get training details for the check
    const training = await trainingApiClient.checkTrainingValidity(training_id, token);
    
    // Verify if user is participant
    const isParticipant = await trainingApiClient.checkUserParticipation(training_id, userId, token);
    
    if (!isParticipant) {
      throw new Error('User is not a participant in this training');
    }
    
    // For QR type, validate timing
    if (presence_type === 'QR') {
      const now = new Date();
      const trainingDate = new Date(training.date);
      
      // Parse start_time and end_time (assuming format like "14:30:00")
      const [startHours, startMinutes] = training.start_time.split(':').map(Number);
      const [endHours, endMinutes] = training.end_time.split(':').map(Number);
      
      // Create Date objects for start and end times
      const trainingStart = new Date(trainingDate);
      trainingStart.setHours(startHours, startMinutes, 0, 0);
      
      const trainingEnd = new Date(trainingDate);
      trainingEnd.setHours(endHours, endMinutes, 0, 0);
      
      // Check if now is between start and end times
      if (now < trainingStart || now > trainingEnd) {
        logger.warn(`User ${userId} attempted QR presence outside training hours for training ${training_id}`);
        throw new Error('QR presence can only be recorded during the training session');
      }
    }
    // For Manual type, no time validation needed
    
    // Record the presence
    const presence = await presenceRepository.recordPresence({
      training_id,
      user_id: userId,
      presence_type
    });
    
    logger.info(`${presence_type} presence recorded for user ${userId} in training ${training_id}`);
    return { alreadyRecorded: false, presence };
  } catch (error) {
    logger.error(`Error in recordPresence service: ${error.message}`);
    throw error;
  }
};

/**
 * Generate QR code for a training (by Kadiv)
 * @param {number} trainingId - Training ID
 * @param {number} expiryMinutes - QR code expiry time in minutes (default 15)
 * @param {string} userId - User ID generating the QR
 * @param {string} authToken - Auth token
 * @returns {Promise<Object>} - Generated QR data
 */
const generateTrainingQR = async (trainingId, expiryMinutes = 15, userId, authToken) => {
  try {
    // Add logging for debugging
    logger.info(`Attempting to generate QR code for training ${trainingId} by user ${userId}`);
    
    // Check if user is Kadiv
    const isKadiv = await trainingApiClient.isUserKadiv(userId, authToken);
    logger.debug(`User ${userId} isKadiv check result: ${isKadiv}`);
    
    // Check if user is Kadiv HD
    const isKadivHD = await trainingApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV', authToken);
    logger.debug(`User ${userId} isKadivHD check result: ${isKadivHD}`);
    
    if (!isKadiv && !isKadivHD) {
      logger.warn(`User ${userId} attempted to generate QR code without permission`);
      throw new Error('Only Kadiv or Kadiv HD can generate QR codes');
    }
    
    // Get training details to calculate dynamic expiry time
    const training = await trainingApiClient.getTrainingDetails(trainingId, authToken);
    
    if (!training) {
      throw new Error('Training not found');
    }
    
    // Log raw training data
    logger.debug(`Raw training data for QR generation: training_id=${trainingId}, date=${training.date}, start_time=${training.start_time}, end_time=${training.end_time}`);
    
    // Calculate expiry based on fixed 15 minute window
    const result = calculateExpiryFromTraining(training);
    
    // Check if we're within the training window
    if (!result.isWithinTraining) {
      throw new Error('QR generation outside training time window');
    }
    
    // Get QR code utility
    const qrUtil = require('../utils/qrCodeUtil');
    
    // Generate QR using the 15-minute expiry timestamp
    const qrData = await qrUtil.generateQRCode(trainingId, result.expiryTimestamp);
    
    // Log exact expiry time for debugging
    logger.info(`QR code generated for training ${trainingId} by ${isKadivHD ? 'Kadiv HD' : 'Kadiv'} ${userId}`);
    logger.info(`QR expiry set to 15 minutes from now: ${result.expiryDate.toISOString()}`);
    
    return qrData;
  } catch (error) {
    logger.error(`Error in generateTrainingQR service: ${error.message}`);
    throw error;
  }
};

/**
 * Get presence list for a training
 * @param {number} trainingId - Training ID
 * @param {string} userId - User ID requesting the list
 * @param {string} authToken - Auth token
 * @returns {Promise<Array>} - Presence list
 */
const getPresenceList = async (trainingId, userId, authToken) => {
  try {
    // Check if the user is a Kadiv or a participant
    const isKadiv = await trainingApiClient.isUserKadiv(userId, authToken);
    const isParticipant = await trainingApiClient.checkUserParticipation(trainingId, userId, authToken);
    
    if (!isKadiv && !isParticipant) {
      logger.warn(`User ${userId} attempted to view presence list but has no permission`);
      throw new Error('No permission to view presence list');
    }
    
    // Get the presence list using Prisma
    const presenceList = await presenceRepository.getPresenceByTraining(trainingId);
    
    logger.info(`Presence list retrieved for training ${trainingId} by user ${userId}`);
    return presenceList;
  } catch (error) {
    logger.error(`Error in getPresenceList service: ${error.message}`);
    throw error;
  }
};

/**
 * Get user's attendance history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Attendance history
 */
const getUserAttendanceHistory = async (userId) => {
  try {
    const attendanceHistory = await presenceRepository.getPresenceByUser(userId);
    
    logger.info(`Attendance history retrieved for user ${userId}`);
    return attendanceHistory;
  } catch (error) {
    logger.error(`Error in getUserAttendanceHistory service: ${error.message}`);
    throw error;
  }
};

/**
 * Get attendance statistics for a training
 * @param {number} trainingId - Training ID
 * @param {string} userId - User ID requesting the stats
 * @param {string} authToken - Auth token
 * @returns {Promise<Object>} - Attendance statistics
 */
const getAttendanceStats = async (trainingId, userId, authToken) => {
  try {
    // Check if user has permission (Kadiv or participant)
    const isKadiv = await trainingApiClient.isUserKadiv(userId, authToken);
    const isParticipant = await trainingApiClient.checkUserParticipation(trainingId, userId, authToken);
    
    if (!isKadiv && !isParticipant) {
      logger.warn(`User ${userId} attempted to view attendance stats but has no permission`);
      throw new Error('No permission to view attendance stats');
    }
    
    // Get all presence records for the training
    const presenceList = await presenceRepository.getPresenceByTraining(trainingId);
    
    // Get training details including expected participants
    const training = await trainingApiClient.checkTrainingValidity(trainingId, authToken);
    
    // Calculate statistics
    const totalParticipants = training.participants?.length || 0;
    const presentCount = presenceList.length;
    const attendanceRate = totalParticipants > 0 ? (presentCount / totalParticipants * 100).toFixed(2) : 0;
    
    const qrCount = presenceList.filter(p => p.presenceType === 'QR').length;
    const manualCount = presenceList.filter(p => p.presenceType === 'Manual').length;
    
    logger.info(`Attendance stats retrieved for training ${trainingId} by user ${userId}`);
    
    return {
      training_id: trainingId,
      total_participants: totalParticipants,
      present_count: presentCount,
      absent_count: totalParticipants - presentCount,
      attendance_rate: `${attendanceRate}%`,
      qr_presence_count: qrCount,
      manual_presence_count: manualCount,
      last_updated: new Date()
    };
  } catch (error) {
    logger.error(`Error in getAttendanceStats service: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a user can view another user's attendance history
 * @param {string} currentUserId - ID of the user making the request
 * @param {string} targetUserId - ID of the user whose history is being viewed
 * @param {string} authToken - Auth token
 * @returns {Promise<boolean>} - True if user has permission
 */
const canViewUserHistory = async (currentUserId, targetUserId, authToken) => {
  try {
    // If same user, always allow
    if (currentUserId === targetUserId) {
      return true;
    }
    
    // Check if current user is a Kadiv
    const isKadiv = await trainingApiClient.isUserKadiv(currentUserId, authToken);
    
    return isKadiv;
  } catch (error) {
    logger.error(`Error in canViewUserHistory service: ${error.message}`);
    return false; // Default to no permission on error
  }
};

module.exports = {
  recordPresenceByQR,
  recordPresenceManually,
  recordPresence,
  generateTrainingQR,
  getPresenceList,
  getUserAttendanceHistory,
  getAttendanceStats,
  canViewUserHistory,
  getTrainingDetails
};
