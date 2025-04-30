const { createTrainingSchema, recordPresenceSchema, checkConflictSchema } = require('../schemas/trainingSchema');
const trainingService = require('../services/trainingService');
const userApiClient = require('../utils/userApiClient');
const logger = require('../logger');
const axios = require('axios'); 
const trainingRepository = require('../repositories/trainingRepo'); 
const { formatDateToIndonesian, formatTimeToWIB } = require('../utils/dateUtils');

/**
 * Create a new training with conflict validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createTraining = async (req, res) => {
  try {
    // Validate request
    const { error, value } = createTrainingSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training data',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { title, date, start_time, end_time, location, division_id, maxParticipants } = value;
    const userId = req.user.id;
    
    // Authorization check - must be division KADIV or HD KADIV
    const isKadiv = await userApiClient.isUserKadiv(userId, division_id);
    const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
    
    if (!isKadiv && !isHdKadiv) {
      logger.warn(`User ${userId} attempted to create training for division ${division_id} without permission`);
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv of this division or Kadiv HD can create training sessions'
      });
    }
    
    // Check for conflicts with other trainings
    const trainingConflict = await trainingService.checkScheduleConflict(date, start_time, end_time);
    
    if (trainingConflict) {
      logger.warn(`Training scheduling conflict detected for ${date} at ${start_time}-${end_time}`);
      return res.status(409).json({
        success: false,
        message: 'Schedule conflict: The selected time range is already booked.',
        conflict: {
          type: 'training',
          title: trainingConflict.title,
          date: formatDateToIndonesian(trainingConflict.date),
          startTime: formatTimeToWIB(trainingConflict.start_time),
          endTime: formatTimeToWIB(trainingConflict.end_time)
        }
      });
    }
    
    // Check for conflicts with meetings
    try {
      const meetingServiceUrl = process.env.MEETING_SERVICE_URL || 'http://meeting-service-api:8003';
      const authToken = req.headers.authorization;
      
      logger.info(`Checking meeting conflicts for ${date} at ${start_time}-${end_time}`);
      
      const conflictResponse = await axios.post(
        `${meetingServiceUrl}/api/meetings/check-conflict`,
        { date, start_time, end_time },
        { 
          headers: { 
            Authorization: authToken,
            'Content-Type': 'application/json'
          },
          timeout: 5000 
        }
      );
      
      if (conflictResponse.data.conflict) {
        logger.warn(`Meeting scheduling conflict detected for ${date} at ${start_time}-${end_time}`);
        return res.status(409).json({
          success: false,
          message: 'Schedule conflict: The selected time range is already booked for a meeting.',
          conflict: {
            type: 'meeting',
            title: conflictResponse.data.meeting.title,
            date: conflictResponse.data.meeting.date,
            startTime: conflictResponse.data.meeting.startTime,
            endTime: conflictResponse.data.meeting.endTime
          }
        });
      }
    } catch (error) {
      logger.error(`Error checking meeting conflicts: ${error.message}`);
      // We'll continue but with a warning
      logger.warn('Continuing with training creation despite meeting conflict check failure');
    }
    
    // Create training with consistent field names
    const training = await trainingService.createTraining({
      title,
      date,
      start_time,
      end_time,
      location,
      division_id,
      divisionId: division_id,
      maxParticipants: maxParticipants || null
    }, userId);
    
    logger.info(`Training created successfully: ID=${training.id}, title="${title}", created by ${userId}`);
    
    return res.status(201).json({
      success: true,
      message: 'Training session created successfully',
      data: training
    });
  } catch (error) {
    logger.error(`Error creating training: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create training session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get training details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTraining = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    const trainingId = parseInt(id, 10);
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      logger.warn(`Training not found: ID=${trainingId}`);
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      training
    });
  } catch (error) {
    logger.error(`Error getting training: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get training details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all upcoming trainings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUpcomingTrainings = async (req, res) => {
  try {
    const trainings = await trainingService.getUpcomingTrainings();
    
    return res.status(200).json({
      success: true,
      trainings
    });
  } catch (error) {
    logger.error(`Error getting upcoming trainings: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get upcoming trainings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a training by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    const trainingId = parseInt(id, 10);
    const result = await trainingService.deleteTraining(trainingId, userId);
    
    logger.info(`Training ${trainingId} deleted by user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Training deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting training: ${error.message}`);
    
    if (error.message === 'Not authorized to delete this training') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this training'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to delete training',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Record presence for training participants
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const recordPresence = async (req, res) => {
  try {
    // Validate request
    const { error, value } = recordPresenceSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid presence data',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { training_id, user_id, present } = value;
    const requesterId = req.user.id;
    
    // Authorization check when recording for others
    if (requesterId !== user_id) {
      const trainingId = parseInt(training_id, 10);
      const training = await trainingService.getTrainingDetails(trainingId);
      
      if (!training) {
        return res.status(404).json({
          success: false,
          message: 'Training not found'
        });
      }
      
      // Only KADIV or HD KADIV can record presence for others
      const isKadiv = await userApiClient.isUserKadiv(requesterId, training.divisionId);
      const isHdKadiv = await userApiClient.isUserInDivisionWithRole(requesterId, 16, 'KADIV');
      
      if (!isKadiv && !isHdKadiv) {
        logger.warn(`User ${requesterId} attempted to record presence for ${user_id} without permission`);
        return res.status(403).json({
          success: false,
          message: 'Only Kadiv of this division or Kadiv HD can record presence for others'
        });
      }
    }
    
    // Record presence
    const result = await trainingService.recordPresence(training_id, user_id, present);
    
    logger.info(`Presence recorded for user ${user_id} in training ${training_id}: present=${present}`);
    
    return res.status(200).json({
      success: true,
      message: 'Presence recorded successfully',
      presence: result
    });
  } catch (error) {
    logger.error(`Error recording presence: ${error.message}`);
    
    if (error.message === 'User is not a participant of this training') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record presence',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send reminders for a specific training
 * @param {Object} training - Training object with participants needing reminders
 * @returns {Promise<Object>} Result with counts of success and failure
 */
const sendTrainingReminders = async (training) => {
  try {
    if (!training) {
      throw new Error('No training provided');
    }
    
    logger.info(`Processing reminders for training ${training.id}: ${training.title} on ${training.date}`);
    
    // Check if there are participants needing reminders
    if (!training.participantsNeedingReminder || training.participantsNeedingReminder.length === 0) {
      logger.info(`No participants need reminders for training ${training.id}`);
      return { success: true, sent: 0, failed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    
    // Send reminder to each participant
    for (const participant of training.participantsNeedingReminder) {
      try {
        // Get user email
        const userEmail = await userApiClient.getUserEmail(participant.userId);
        
        if (!userEmail) {
          logger.warn(`No email found for user ${participant.userId}, skipping reminder`);
          failed++;
          continue;
        }
        
        // Send the reminder
        const result = await sendReminderToParticipant(training, participant, userEmail);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
        
        // Add a small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`Error processing reminder for participant ${participant.userId}: ${error.message}`);
        failed++;
      }
    }
    
    logger.info(`Completed processing reminders for training ${training.id}: ${sent} sent, ${failed} failed`);
    return { success: true, sent, failed };
  } catch (error) {
    logger.error(`Error in sendTrainingReminders: ${error.message}`);
    return { success: false, sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Manually trigger sending reminders for all upcoming trainings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const manuallyTriggerReminders = async (req, res) => {
  try {
    // Return response immediately to avoid client timeout
    res.status(200).json({
      success: true,
      message: 'Training reminders triggered manually'
    });
    
    // Process reminders in background
    process.nextTick(async () => {
      try {
        // Get upcoming trainings
        const trainings = await trainingRepository.getTrainingsForReminders();
        
        logger.info(`Found ${trainings.length} trainings needing reminders`);
        
        if (!trainings.length) {
          logger.info('No trainings to send reminders for');
          return;
        }
        
        logger.info(`Processing reminders for ${trainings.length} trainings`);
        
        const results = {
          sent: 0,
          failed: 0,
          trainings: []
        };
        
        for (const training of trainings) {
          try {
            logger.info(`Sending reminders for training ${training.id} - ${training.title}`);
            
            // Process each training
            const result = await trainingService.sendReminderForTraining(training);
            
            results.sent += result.count;
            results.failed += result.failed;
            results.trainings.push({
              id: training.id,
              title: training.title,
              sent: result.count,
              failed: result.failed
            });
            
            logger.info(`Training ${training.id} reminders: sent=${result.count}, failed=${result.failed}`);
          } catch (trainingError) {
            logger.error(`Error processing reminders for training ${training.id}: ${trainingError.message}`);
            results.failed += (training.participants?.length || 0);
          }
        }
        
        logger.info(`Training reminder processing completed: Sent ${results.sent}, Failed ${results.failed}`);
      } catch (error) {
        logger.error(`Error in manual reminder processing: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error triggering manual reminders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error triggering manual reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add participants to a training
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addParticipantsToTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;
    const userId = req.user.id;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs must be provided as an array'
      });
    }
    
    // Get training details to check division
    const trainingId = parseInt(id, 10);
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Authorization check
    const isKadiv = await userApiClient.isUserKadiv(userId, training.divisionId);
    const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
    
    if (!isKadiv && !isHdKadiv) {
      logger.warn(`User ${userId} attempted to add participants to training ${trainingId} without permission`);
      return res.status(403).json({
        success: false,
        message: 'Only Kadivs can add participants'
      });
    }
    
    // Add participants
    const result = await trainingService.addParticipants(trainingId, user_ids);
    
    logger.info(`Added ${result.length} participants to training ${trainingId}`);
    
    return res.status(200).json({
      success: true,
      message: `Added ${result.length} participants to training`,
      participants: result
    });
  } catch (error) {
    logger.error(`Error adding participants to training: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to add participants to training',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add all division members to a training
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addDivisionMembersToTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    // Get training details
    const trainingId = parseInt(id, 10);
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Authorization check
    const isKadiv = await userApiClient.isUserKadiv(userId, training.divisionId);
    const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
    
    if (!isKadiv && !isHdKadiv) {
      logger.warn(`User ${userId} attempted to add division members to training ${trainingId} without permission`);
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv of this division or Kadiv HD can add division members'
      });
    }
    
    // Add division members
    const result = await trainingService.addDivisionMembers(trainingId, training.divisionId);
    
    logger.info(`Added ${result.added} division members to training ${trainingId}`);
    
    return res.status(200).json({
      success: true,
      message: `Added ${result.added} division members to training`,
      participants: result.participants
    });
  } catch (error) {
    logger.error(`Error adding division members to training: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to add division members to training',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Force add participants to training (special operation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const forceAddParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    // Get training details
    const trainingId = parseInt(id, 10);
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Authorization check - special admin operation
    const isKadiv = await userApiClient.isUserKadiv(userId, training.divisionId);
    const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
    
    if (!isKadiv && !isHdKadiv) {
      logger.warn(`User ${userId} attempted to force-add participants to training ${trainingId} without permission`);
      return res.status(403).json({
        success: false,
        message: 'Only KADIV of division or KADIV HD can add participants'
      });
    }
    
    // Force add division members
    const result = await trainingService.forceAddDivisionMembers(trainingId, training.divisionId);
    
    logger.info(`Force-added ${result.length} participants to training ${trainingId}`);
    
    return res.status(200).json({
      success: true,
      message: `Added ${result.length} participants to training`,
      participants: result
    });
  } catch (error) {
    logger.error(`Error force-adding participants: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to add participants',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Force send reminder for specific training
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const forceSendReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Input validation
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training ID'
      });
    }
    
    // Authorization check - HD KADIV only
    const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
    
    if (!isHdKadiv) {
      logger.warn(`User ${userId} attempted to force-send reminders without HD KADIV permission`);
      return res.status(403).json({
        success: false,
        message: 'Only KADIV HD can force-send reminders'
      });
    }
    
    // Get training with participants
    const trainingId = parseInt(id, 10);
    const training = await trainingService.getTrainingDetails(trainingId);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Check if there are participants
    if (!training.participants || training.participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants found for this training. Add participants first.'
      });
    }
    
    // Force send reminders
    const result = await trainingService.sendReminderForTraining(training);
    
    logger.info(`Force sent reminders for training ${trainingId}: sent=${result.count}, failed=${result.failed}`);
    
    return res.status(200).json({
      success: true,
      message: `Force sent reminders for training ${id}: ${result.count} sent, ${result.failed} failed`
    });
  } catch (error) {
    logger.error(`Error forcing training reminders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to force training reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check for schedule conflicts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkConflict = async (req, res) => {
  try {
    // Validate request
    const { error, value } = checkConflictSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data for conflict check',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    const { date, start_time, end_time } = value;
    const conflict = await trainingService.checkScheduleConflict(date, start_time, end_time);
    
    return res.status(200).json({
      success: true,
      conflict: !!conflict,
      training: conflict ? {
        title: conflict.title,
        date: conflict.date,
        startTime: conflict.start_time,
        endTime: conflict.end_time
      } : null
    });
  } catch (error) {
    logger.error(`Error checking training conflict: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error checking for conflicts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check if user is kadiv
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkUserKadivStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const divisionId = req.query.division_id;
    
    if (!userId || !divisionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and division ID are required'
      });
    }
    
    const isKadiv = await trainingService.isUserKadiv(userId, parseInt(divisionId, 10));
    
    return res.status(200).json({
      success: true,
      isKadiv
    });
  } catch (error) {
    logger.error(`Error checking kadiv status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error checking kadiv status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get participants for a training
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTrainingParticipants = async (req, res) => {
  // Reuse the getTraining function for simplicity
  return getTraining(req, res);
};

/**
 * Send reminder for a specific training to one participant
 * @param {Object} training - Training object
 * @param {Object} participant - Participant object
 * @param {String} userEmail - User's email address
 * @returns {Promise<Object>} Result with success status
 */
const sendReminderToParticipant = async (training, participant, userEmail) => {
  try {
    if (!training || !participant || !userEmail) {
      logger.error('Missing required parameters for sending reminder');
      return { success: false, error: 'Missing required parameters' };
    }
    
    // Format date for email - Generate a string, not a Date object
    const trainingDate = new Date(training.date);
    const formattedDate = formatDateToIndonesian(trainingDate);
    
    // Format time properly to avoid 1970 epoch issue
    const formattedTime = formatTimeToWIB(training.start_time);
    
    logger.info(`Sending reminder to ${userEmail} for training on ${formattedDate} at ${formattedTime}`);
    
    // Prepare data for email service - training_date must be a string
    const reminderData = {
      email: userEmail,
      user_id: participant.userId,
      training_id: training.id,
      training_title: training.title,
      training_date: formattedDate,  // String, not Date object
      training_time: formattedTime,
      training_location: training.location || 'Lokasi belum ditentukan',
      division_id: training.divisionId
      // Remove is_today and is_tomorrow fields not in schema
    };
    
    // Send reminder email
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';
    
    const response = await axios.post(
      `${emailServiceUrl}/api/email/training-reminder`,
      reminderData,
      { 
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.data && response.data.success) {
      // Record that the reminder was sent
      const recordSuccess = await trainingRepository.recordReminderSent(training.id, participant.userId);
      
      if (recordSuccess) {
        logger.info(`✓ Successfully sent and recorded reminder for training ${training.id} to ${userEmail}`);
        return { success: true, email: userEmail };
      } else {
        logger.warn(`Reminder sent to ${userEmail} but failed to record status`);
        return { success: false, email: userEmail, error: 'Failed to record reminder status' };
      }
    } else {
      logger.warn(`Email service returned non-success response for ${userEmail}`);
      return { success: false, email: userEmail, error: 'Email service error' };
    }
  } catch (error) {
    logger.error(`Error sending reminder to ${userEmail}: ${error.message}`);
    return { success: false, email: userEmail, error: error.message };
  }
};

/**
 * Process all training reminders for upcoming trainings
 * @returns {Promise<Object>} Result with counts of success and failure
 */
const processTrainingReminders = async () => {
  try {
    logger.info('Starting training reminder process');
    
    // Get trainings needing reminders
    const trainings = await trainingRepository.getTrainingsForReminders();
    
    if (!trainings || trainings.length === 0) {
      logger.info('No trainings found needing reminders');
      return { success: true, sent: 0, failed: 0 };
    }
    
    logger.info(`Found ${trainings.length} trainings needing reminders`);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    // Process each training
    for (const training of trainings) {
      try {
        const result = await sendTrainingReminders(training);
        totalSent += result.sent;
        totalFailed += result.failed;
      } catch (error) {
        logger.error(`Error processing training ${training.id}: ${error.message}`);
        totalFailed += (training.participantsNeedingReminder?.length || 0);
      }
    }
    
    logger.info(`Completed all training reminders: ${totalSent} sent, ${totalFailed} failed`);
    return { success: true, sent: totalSent, failed: totalFailed };
  } catch (error) {
    logger.error(`Error in processTrainingReminders: ${error.message}`);
    return { success: false, sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Express handler for manually triggering training reminders
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleManualReminderTrigger = async (req, res) => {
  try {
    // Respond immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: 'Training reminder process started'
    });
    
    // Process reminders in the background
    process.nextTick(async () => {
      try {
        const result = await processTrainingReminders();
        logger.info(`Manual reminder process completed: sent ${result.sent}, failed ${result.failed}`);
      } catch (error) {
        logger.error(`Background training reminder process failed: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error starting training reminder process: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to start training reminder process',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Express handler for manually triggering a reminder for a specific training
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSingleTrainingReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Training ID is required'
      });
    }
    
    // Get training details
    const trainingId = parseInt(id, 10);
    const training = await trainingRepository.getTrainingById(trainingId);
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Ensure training has participants
    if (!training.participants || training.participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants found for this training'
      });
    }
    
    // Consider all participants as needing a reminder for manual trigger
    training.participantsNeedingReminder = training.participants;
    
    // Respond immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: `Sending reminders for training ${id} to ${training.participants.length} participants`
    });
    
    // Process reminder in the background
    process.nextTick(async () => {
      try {
        const result = await sendTrainingReminders(training);
        logger.info(`Single training reminder completed: sent ${result.sent}, failed ${result.failed}`);
      } catch (error) {
        logger.error(`Background single training reminder process failed: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error processing single training reminder: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to process training reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * Handler untuk trigger manual training reminder
 */
const triggerTrainingReminders = async (req, res) => {
  try {
    // Respond immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: 'Training reminder process started'
    });
    
    // Proses di background dengan process.nextTick
    process.nextTick(async () => {
      try {
        const result = await trainingService.sendTrainingReminders();
        logger.info(`Manual training reminder completed: sent ${result.count}, failed ${result.failed}`);
      } catch (error) {
        logger.error(`Background training reminder process failed: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error triggering training reminders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger training reminders'
    });
  }
};
/**
 * Get trainings count by all divisions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTrainingsCountByAllDivisions = async (req, res) => {
  try {
    const divisionCounts = await trainingService.getTrainingsCountByAllDivisions();
    
    return res.status(200).json({
      success: true,
      divisionCounts
    });
  } catch (error) {
    logger.error(`Error getting trainings count by all divisions: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get trainings count by divisions'
    });
  }
};

module.exports = {
  createTraining,
  getTraining,
  getUpcomingTrainings,
  recordPresence,
  triggerTrainingReminders,
  manuallyTriggerReminders,
  addParticipantsToTraining,
  addDivisionMembersToTraining,
  forceAddParticipants,
  forceSendReminder,
  checkConflict,
  checkUserKadivStatus,
  getTrainingParticipants,
  deleteTraining,
  processTrainingReminders,
  sendTrainingReminders,
  handleManualReminderTrigger,
  handleSingleTrainingReminder,
  getTrainingsCountByAllDivisions
};