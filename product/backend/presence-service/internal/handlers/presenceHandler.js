const { 
  qrPresenceSchema, 
  manualPresenceSchema, 
  generateQrSchema,
  recordPresenceSchema 
} = require('../schemas/presenceSchema');
const presenceService = require('../services/presenceService');
const logger = require('../logger');
const trainingApiClient = require('../utils/trainingApiClient');
const userApiClient = require('../utils/userApiClient');

const recordPresence = async (req, res) => {
  try {
    logger.debug(`Received presence record request with body: ${JSON.stringify(req.body)}`);
    
    const { error, value } = recordPresenceSchema.validate(req.body);
    
    if (error) {
      logger.warn(`Invalid presence data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid presence data',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { training_id, presence_type } = value;
    const userId = req.user.id;
    
    const isKadiv = await trainingApiClient.isUserKadiv(userId, req.token);
    const isKadivHD = await trainingApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV', req.token);
    
    if (!isKadiv && !isKadivHD) {
      logger.warn(`User ${userId} attempted to record presence directly but is not a Kadiv or Kadiv HD`);
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv or Kadiv HD can access this endpoint'
      });
    }
    
    const result = await presenceService.recordPresence(
      { training_id, presence_type }, 
      userId,
      req.token
    );
    
    if (result.alreadyRecorded) {
      return res.status(200).json({
        success: true,
        message: 'Presence already recorded',
        presence: result.presence
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Presence recorded successfully',
      presence: result.presence
    });
  } catch (error) {
    logger.error(`Error recording presence: ${error.message}`);
    
    if (error.message === 'Training not found') {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    if (error.message === 'User is not a participant of this training') {
      return res.status(403).json({
        success: false,
        message: 'User is not a participant of this training'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record presence'
    });
  }
};

const recordQrPresence = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = qrPresenceSchema.validate(req.body);
    
    if (error) {
      logger.warn(`Invalid QR presence data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { qr_code } = value;
    const userId = req.user.id;
    
    const result = await presenceService.recordPresenceByQR(
      qr_code,
      userId,
      req.token
    );
    
    if (result.alreadyRecorded) {
      return res.status(200).json({
        success: true,
        message: 'Presence already recorded',
        presence: result.presence
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Presence recorded successfully',
      presence: result.presence
    });
  } catch (error) {
    logger.error(`Error recording QR presence: ${error.message}`);

    if (error.message === 'QR code has expired') {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired'
      });
    }
    
    if (error.message === 'QR presence can only be recorded during the training session') {
      return res.status(403).json({
        success: false,
        message: 'QR presence can only be recorded during the training session'
      });
    }
    
    if (error.message === 'User is not a participant in this training') {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this training'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record presence'
    });
  }
};

const recordManualPresence = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = manualPresenceSchema.validate(req.body);
    
    if (error) {
      logger.warn(`Invalid manual presence data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid manual presence data',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { training_id, user_id } = value;
    const currentUserId = req.user.id;
    
    // Verify that the user is a Kadiv or Kadiv HD
    const isKadiv = await trainingApiClient.isUserKadiv(currentUserId, req.token);
    const isKadivHD = await trainingApiClient.isUserInDivisionWithRole(currentUserId, 16, 'KADIV', req.token);
    
    if (!isKadiv && !isKadivHD) {
      logger.warn(`User ${currentUserId} attempted to record manual presence but is not a Kadiv or Kadiv HD`);
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv or Kadiv HD can record presence manually'
      });
    }
    
    const result = await presenceService.recordPresenceManually(
      training_id,
      user_id,
      currentUserId,
      req.token
    );
    
    if (result.alreadyRecorded) {
      return res.status(200).json({
        success: true,
        message: 'Presence already recorded',
        presence: result.presence
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Presence recorded manually successfully',
      presence: result.presence
    });
  } catch (error) {
    logger.error(`Error in manual presence recording: ${error.message}`);
    
    if (error.message === 'Training not found') {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (error.message === 'Only Kadiv or Kadiv HD can record presence manually') {
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv or Kadiv HD can record presence manually'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record presence manually'
    });
  }
};

const generateQrCode = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = generateQrSchema.validate(req.body);
    
    if (error) {
      logger.warn(`Invalid QR generation data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid QR generation data',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { training_id } = value;
    const userId = req.user.id;
    
    // Get training details to validate time window
    try {
      // Fetch training details with time information
      const training = await presenceService.getTrainingDetails(training_id, req.token);
      
      if (!training) {
        logger.warn(`Training not found for QR generation: ID=${training_id}`);
        return res.status(404).json({
          success: false,
          message: 'Training not found'
        });
      }
      
      // Log raw training data for debugging the expiry time issue
      logger.debug(`Raw training data received for QR generation:`, {
        training_id: training_id,
        date: training.date,
        start_time: training.start_time,
        end_time: training.end_time,
        raw_date_type: typeof training.date,
        raw_end_time_type: typeof training.end_time
      });
      
      // Check if current time is within training session time window
      const now = new Date();
      const trainingDate = new Date(training.date);
      
      // Format date strings for comparison - training date has no time component
      const todayDateString = now.toISOString().split('T')[0];
      const trainingDateString = trainingDate.toISOString().split('T')[0];
      
      // Parse start_time and end_time (assuming format like "14:30:00")
      const [startHours, startMinutes] = training.start_time.split(':').map(Number);
      const [endHours, endMinutes] = training.end_time.split(':').map(Number);
      
      // Create Date objects for start and end times on training date
      const trainingStart = new Date(trainingDate);
      trainingStart.setHours(startHours, startMinutes, 0, 0);
      
      const trainingEnd = new Date(trainingDate);
      trainingEnd.setHours(endHours, endMinutes, 0, 0);
      
      logger.debug(`Time check for QR generation:`, {
        now: now.toISOString(),
        trainingDate: trainingDateString,
        trainingStart: trainingStart.toISOString(),
        trainingEnd: trainingEnd.toISOString()
      });
      
      // Check if training is today
      if (todayDateString !== trainingDateString) {
        logger.warn(`QR generation attempted for training on ${trainingDateString}, but today is ${todayDateString}`);
        return res.status(403).json({
          success: false,
          message: 'QR codes can only be generated on the day of the training session. Please use manual presence recording for past or future sessions.'
        });
      }
      
      // Check if training time window has arrived
      if (now < trainingStart) {
        const minutesUntilStart = Math.round((trainingStart - now) / 60000);
        logger.warn(`QR generation attempted too early: ${now.toISOString()} < ${trainingStart.toISOString()} (${minutesUntilStart} minutes before start)`);
        return res.status(403).json({
          success: false,
          message: `QR codes can only be generated after the training session begins (in ${minutesUntilStart} minutes). Please try again later.`
        });
      }
      
      // Check if training has already ended
      if (now > trainingEnd) {
        const minutesSinceEnd = Math.round((now - trainingEnd) / 60000);
        logger.warn(`QR generation attempted after training ended: ${now.toISOString()} > ${trainingEnd.toISOString()} (${minutesSinceEnd} minutes after end)`);
        return res.status(403).json({
          success: false,
          message: 'QR codes cannot be generated after the training session has ended. Please use manual presence recording for past sessions.'
        });
      }
      
      // If we've made it here, time validation has passed
      logger.info(`Time validation passed for QR generation, training ID=${training_id} (${trainingStart.toLocaleTimeString()} - ${trainingEnd.toLocaleTimeString()})`);
    } catch (timeError) {
      logger.error(`Error validating training time for QR generation: ${timeError.message}`);
      // Continue with QR generation if time validation fails due to errors
      // This is a graceful fallback in case of data issues
      logger.warn('Proceeding with QR generation despite time validation error (fallback mode)');
    }
    
    // Generate QR code as Kadiv or Kadiv HD with 15-minute expiry
    const qrData = await presenceService.generateTrainingQR(
      training_id,
      15, // Set fixed expiry time to 15 minutes
      userId,
      req.token
    );
    
    logger.info(`QR code successfully generated for training ${training_id} with expiry at ${qrData.expires_at}`);
    
    return res.status(200).json({
      success: true,
      message: 'QR code generated successfully (expires in 15 minutes)',
      qr_data: qrData
    });
  } catch (error) {
    logger.error(`Error generating QR code: ${error.message}`);
    
    if (error.message === 'Only Kadiv or Kadiv HD can generate QR codes') {
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv or Kadiv HD can generate QR codes'
      });
    }
    
    if (error.message === 'Training not found') {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    if (error.message === 'QR generation outside training time window') {
      return res.status(403).json({
        success: false,
        message: 'QR presence can only be recorded during the active training session. Please use manual presence entry.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
};

/**
 * Get list of participants who have recorded presence for a training
 */
const getPresenceList = async (req, res) => {
  try {
    const trainingId = parseInt(req.params.trainingId);
    
    if (isNaN(trainingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    const userId = req.user.id;
    
    // Get presence list (with authorization check)
    const presenceList = await presenceService.getPresenceList(
      trainingId,
      userId,
      req.token
    );
    
    return res.status(200).json({
      success: true,
      presence_list: presenceList
    });
  } catch (error) {
    logger.error(`Error getting presence list: ${error.message}`);
    
    if (error.message === 'No permission to view presence list') {
      return res.status(403).json({
        success: false,
        message: 'No permission to view presence list'
      });
    }
    
    if (error.message === 'Training not found') {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get presence list'
    });
  }
};

/**
 * Get attendance history for a user
 */
const getAttendanceHistory = async (req, res) => {
  try {
    // Get user ID from JWT token or params (for Kadiv viewing others)
    const userId = req.params.userId || req.user.id;
    
    // If viewing other's history, check permission
    if (req.params.userId && req.params.userId !== req.user.id) {
      const hasPermission = await presenceService.canViewUserHistory(
        req.user.id,
        req.params.userId,
        req.token
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this user\'s attendance history'
        });
      }
    }
    
    // Get attendance history
    const attendanceHistory = await presenceService.getUserAttendanceHistory(userId);
    
    return res.status(200).json({
      success: true,
      attendance_history: attendanceHistory
    });
  } catch (error) {
    logger.error(`Error getting attendance history: ${error.message}`);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get attendance history'
    });
  }
};

/**
 * Get attendance statistics for a training
 */
const getAttendanceStats = async (req, res) => {
  try {
    const trainingId = parseInt(req.params.trainingId);
    
    if (isNaN(trainingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    const userId = req.user.id;
    
    // Get attendance stats with authorization check
    const stats = await presenceService.getAttendanceStats(
      trainingId,
      userId,
      req.token
    );
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Error getting attendance stats: ${error.message}`);
    
    if (error.message === 'No permission to view attendance stats') {
      return res.status(403).json({
        success: false, 
        message: 'No permission to view attendance stats'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get attendance statistics'
    });
  }
};

const getMyAttendanceCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's attendance history
    const attendanceHistory = await presenceService.getUserAttendanceHistory(userId);
    
    // Get the user's division
    let userDivision = null;
    try {
      const userDivisions = await userApiClient.getUserDivisions(userId, req.token);
      if (userDivisions && userDivisions.length > 0) {
        // Prioritize non-HD division if the user has multiple divisions
        const nonHdDivision = userDivisions.find(div => div.id !== 16); // 16 is HD division
        userDivision = nonHdDivision || userDivisions[0];
      }
    } catch (error) {
      logger.error(`Error getting user divisions: ${error.message}`);
      // Continue even if we can't get the division
    }
    
    // Get total number of sessions, filtered by division if possible
    let totalSessions = 0;
    try {
      if (userDivision) {
        // Get division-specific training count
        totalSessions = await trainingApiClient.getTotalTrainingsCount(req.token, userDivision.id);
      } else {
        // Fallback to total training count
        totalSessions = await trainingApiClient.getTotalTrainingsCount(req.token);
      }
    } catch (error) {
      logger.error(`Error getting total sessions: ${error.message}`);
      totalSessions = 1; // Default if failed
    }
    
    return res.status(200).json({
      success: true,
      count: attendanceHistory.length,
      totalSessions: Math.max(1, totalSessions),
      userDivisionId: userDivision ? userDivision.id : null
    });
  } catch (error) {
    logger.error(`Error getting attendance count: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attendance count'
    });
  }
};

module.exports = {
  recordPresence,
  recordQrPresence,
  recordManualPresence,
  generateQrCode,
  getPresenceList,
  getAttendanceHistory,
  getAttendanceStats,
  getMyAttendanceCount  
};