const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../logger');

/**
 * Create a new training
 * @param {Object} trainingData - Training data from request
 * @returns {Promise<Object>} Created training object
 */
const createTraining = async (trainingData) => {
  try {
    const { title, date, start_time, end_time, location, created_by, division_id, divisionId } = trainingData;
    
    // Use either division_id or divisionId, preferring the first available
    const actualDivisionId = division_id || divisionId;
    
    if (!actualDivisionId) {
      throw new Error('Division ID is required');
    }
    
    // Parse date to Date object
    const trainingDate = new Date(date);
    
    // Parse start_time
    let startHours = 0, startMinutes = 0;
    if (typeof start_time === 'string') {
      // Handle both HH:MM and HH.MM formats
      const parts = start_time.includes(':') ? start_time.split(':') : start_time.split('.');
      
      if (parts.length >= 2) {
        startHours = parseInt(parts[0], 10);
        startMinutes = parseInt(parts[1], 10);
      }
    } else if (start_time instanceof Date) {
      startHours = start_time.getHours();
      startMinutes = start_time.getMinutes();
    }
    
    // Parse end_time
    let endHours = 0, endMinutes = 0;
    if (typeof end_time === 'string') {
      // Handle both HH:MM and HH.MM formats
      const parts = end_time.includes(':') ? end_time.split(':') : end_time.split('.');
      
      if (parts.length >= 2) {
        endHours = parseInt(parts[0], 10);
        endMinutes = parseInt(parts[1], 10);
      }
    } else if (end_time instanceof Date) {
      endHours = end_time.getHours();
      endMinutes = end_time.getMinutes();
    }
    
    // Create Date objects with full date+time
    const fullStartTime = new Date(trainingDate);
    fullStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const fullEndTime = new Date(trainingDate);
    fullEndTime.setHours(endHours, endMinutes, 0, 0);
    
    // Validate: end time must be after start time
    if (fullEndTime <= fullStartTime) {
      throw new Error('End time must be after start time');
    }
    
    logger.info(`Creating training with: date=${trainingDate.toISOString()}, start=${fullStartTime.toISOString()}, end=${fullEndTime.toISOString()}`);
    
    // Match field names with Prisma schema
    const result = await prisma.training.create({
      data: {
        title,
        date: trainingDate,
        start_time: fullStartTime, // Use full date+time object
        end_time: fullEndTime,     // Use full date+time object
        location,
        createdBy: created_by,     // Map to Prisma's camelCase field
        divisionId: parseInt(actualDivisionId, 10) // Ensure integer
      }
    });
    
    return result;
  } catch (error) {
    logger.error(`Error creating training: ${error.message}`);
    throw error;
  }
};

/**
 * Add a single participant to a training
 * @param {Number|String} trainingId - Training ID
 * @param {String} userId - User ID to add
 * @returns {Promise<Object>} Result with added participant and join status
 */
const addParticipant = async (trainingId, userId) => {
  try {
    // Ensure trainingId is a number
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid user ID is required');
    }
    
    // Check if participant already exists
    const existingParticipant = await prisma.trainingParticipant.findFirst({
      where: {
        trainingId: numericTrainingId,
        userId: userId
      }
    });
    
    if (existingParticipant) {
      logger.info(`User ${userId} is already a participant of training ${numericTrainingId}`);
      return { alreadyJoined: true, participant: existingParticipant };
    }
    
    // Add participant
    const participant = await prisma.trainingParticipant.create({
      data: {
        trainingId: numericTrainingId,
        userId: userId,
        joinedAt: new Date(),
        remindedAt: null // Explicitly set to null for future reminders
      }
    });
    
    logger.info(`Added user ${userId} as participant to training ${numericTrainingId}`);
    return { alreadyJoined: false, participant };
  } catch (error) {
    logger.error(`Error adding participant: ${error.message}`);
    throw error;
  }
};

/**
 * Add multiple participants to a training
 * @param {Number|String} trainingId - Training ID
 * @param {Array<String>} userIds - Array of user IDs to add
 * @returns {Promise<Array>} Array of all participants
 */
const addMultipleParticipants = async (trainingId, userIds) => {
  try {
    if (!trainingId || isNaN(parseInt(trainingId, 10))) {
      throw new Error(`Invalid training ID: ${trainingId}`);
    }
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn(`No valid userIds provided for training ${trainingId}`);
      return [];
    }
    
    // Clean the array of invalid values
    const cleanUserIds = userIds.filter(id => id && typeof id === 'string');
    
    if (cleanUserIds.length === 0) {
      logger.warn(`All userIds filtered out as invalid for training ${trainingId}`);
      return [];
    }
    
    // Convert trainingId to number
    const numericTrainingId = parseInt(trainingId, 10);
    
    logger.info(`Adding ${cleanUserIds.length} participants to training ${numericTrainingId}`);
    
    // Get existing participants to avoid duplicates
    const existingParticipants = await prisma.trainingParticipant.findMany({
      where: { 
        trainingId: numericTrainingId,
        userId: { in: cleanUserIds }
      }
    });
    
    // Find which users are already participants
    const existingUserIds = new Set(existingParticipants.map(p => p.userId));
    
    // Filter out users that are already participants
    const newUserIds = cleanUserIds.filter(userId => !existingUserIds.has(userId));
    
    if (newUserIds.length === 0) {
      logger.info(`All users are already participants of training ${numericTrainingId}`);
      return existingParticipants;
    }
    
    logger.info(`Adding ${newUserIds.length} new participants to training ${numericTrainingId}`);
    
    // Create participants one by one to prevent errors from stopping all additions
    const newParticipants = [];
    for (const userId of newUserIds) {
      try {
        const participant = await prisma.trainingParticipant.create({
          data: { 
            trainingId: numericTrainingId, 
            userId,
            joinedAt: new Date(),
            remindedAt: null // Explicitly set null for future reminders
          }
        });
        newParticipants.push(participant);
      } catch (participantError) {
        logger.error(`Error adding participant ${userId}: ${participantError.message}`);
      }
    }
    
    logger.info(`Successfully added ${newParticipants.length} participants to training ${numericTrainingId}`);
    
    // Return all participants (existing + new)
    return [...existingParticipants, ...newParticipants];
  } catch (error) {
    logger.error(`Error in addMultipleParticipants: ${error.message}`);
    throw error;
  }
};

/**
 * Force add division members to a training, ignoring errors
 * @param {Number|String} trainingId - Training ID
 * @param {Array<String>} userIds - Array of user IDs to add
 * @returns {Promise<Array>} Array of added participants
 */
const forceAddDivisionMembers = async (trainingId, userIds) => {
  try {
    if (!trainingId || isNaN(parseInt(trainingId, 10))) {
      throw new Error(`Invalid training ID: ${trainingId}`);
    }
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn(`No valid userIds provided for training ${trainingId}`);
      return [];
    }
    
    // Clean array of invalid values
    const cleanUserIds = userIds.filter(id => id && typeof id === 'string');
    
    if (cleanUserIds.length === 0) {
      logger.warn(`All userIds filtered out as invalid for training ${trainingId}`);
      return [];
    }
    
    logger.info(`Force adding ${cleanUserIds.length} participants to training ${trainingId}`);
    
    // Convert trainingId to number
    const numericTrainingId = parseInt(trainingId, 10);
    
    // Attempt to create participants ignoring existing ones
    const participants = [];
    
    for (const userId of cleanUserIds) {
      try {
        // Try to find existing first
        const existing = await prisma.trainingParticipant.findFirst({
          where: { 
            trainingId: numericTrainingId,
            userId
          }
        });
        
        if (existing) {
          participants.push(existing);
          continue;
        }
        
        // Create new participant
        const participant = await prisma.trainingParticipant.create({
          data: { 
            trainingId: numericTrainingId, 
            userId,
            joinedAt: new Date(),
            remindedAt: null // Reset reminder status
          }
        });
        participants.push(participant);
      } catch (participantError) {
        logger.error(`Error force adding participant ${userId}: ${participantError.message}`);
      }
    }
    
    logger.info(`Successfully force added ${participants.length} participants to training ${numericTrainingId}`);
    return participants;
  } catch (error) {
    logger.error(`Error in forceAddDivisionMembers: ${error.message}`);
    throw error;
  }
};

/**
 * Get all participants for a training
 * @param {Number|String} trainingId - Training ID
 * @returns {Promise<Array>} Array of training participants
 */
const getTrainingParticipants = async (trainingId) => {
  try {
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    return await prisma.trainingParticipant.findMany({
      where: { trainingId: numericTrainingId },
      orderBy: { joinedAt: 'asc' }  
    });
  } catch (error) {
    logger.error(`Error getting training participants: ${error.message}`);
    throw error;
  }
};

/**
 * Record presence for a participant
 * @param {Number|String} trainingId - Training ID
 * @param {String} userId - User ID
 * @param {Boolean} present - Whether user is present
 * @returns {Promise<Object>} Created presence record
 */
const recordPresence = async (trainingId, userId, present) => {
  try {
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    return await prisma.presence.create({
      data: {
        trainingId: numericTrainingId,
        userId,
        presenceType: present ? 'PRESENT' : 'ABSENT',
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error(`Error recording presence: ${error.message}`);
    throw error;
  }
};

/**
 * Check for scheduling conflicts
 * @param {Date|String} date - Date to check
 * @param {String|Date} startTime - Start time
 * @param {String|Date} endTime - End time
 * @returns {Promise<Object|null>} Conflicting training or null
 */
const findScheduleConflict = async (date, startTime, endTime) => {
  try {
    // Format date
    const baseDate = new Date(date);
    const dateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    logger.info(`Checking conflicts for date ${dateStr}, time ${startTime} - ${endTime}`);
    
    // Convert time to minutes for easier comparison
    let startMinutes, endMinutes;
    
    if (typeof startTime === 'string') {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      startMinutes = startHour * 60 + startMinute;
    } else if (startTime instanceof Date) {
      startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    }
    
    if (typeof endTime === 'string') {
      const [endHour, endMinute] = endTime.split(':').map(Number);
      endMinutes = endHour * 60 + endMinute;
    } else if (endTime instanceof Date) {
      endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    }
    
    // Validate times
    if (endMinutes <= startMinutes) {
      throw new Error('End time must be after start time');
    }
    
    // Find trainings on the same date
    const trainings = await prisma.training.findMany({
      where: { date: baseDate }
    });
    
    logger.info(`Found ${trainings.length} trainings on the same date to check for conflicts`);
    
    // Check each training for conflict
    for (const training of trainings) {
      // Convert existing training time to minutes
      let existingStartMinutes, existingEndMinutes;
      
      if (typeof training.start_time === 'string') {
        const [startHour, startMinute] = training.start_time.split(':').map(Number);
        existingStartMinutes = startHour * 60 + startMinute;
      } else if (training.start_time instanceof Date) {
        existingStartMinutes = training.start_time.getHours() * 60 + training.start_time.getMinutes();
      }
      
      if (typeof training.end_time === 'string') {
        const [endHour, endMinute] = training.end_time.split(':').map(Number);
        existingEndMinutes = endHour * 60 + endMinute;
      } else if (training.end_time instanceof Date) {
        existingEndMinutes = training.end_time.getHours() * 60 + training.end_time.getMinutes();
      }
      
      logger.debug(`Comparing existing training ${training.id} (${existingStartMinutes}-${existingEndMinutes}) with new time (${startMinutes}-${endMinutes})`);
      
      // Check for any overlap scenarios
      const hasOverlap = (
        // New training starts during existing training
        (startMinutes >= existingStartMinutes && startMinutes < existingEndMinutes) ||
        // New training ends during existing training
        (endMinutes > existingStartMinutes && endMinutes <= existingEndMinutes) ||
        // New training encompasses existing training
        (startMinutes <= existingStartMinutes && endMinutes >= existingEndMinutes) ||
        // Existing training encompasses new training
        (existingStartMinutes <= startMinutes && existingEndMinutes >= endMinutes)
      );
      
      if (hasOverlap) {
        logger.warn(`Training conflict detected: New training (${startMinutes}-${endMinutes}) conflicts with existing training ${training.id} (${existingStartMinutes}-${existingEndMinutes})`);
        return training;
      }
    }
    
    // No conflicts found
    return null;
  } catch (error) {
    logger.error(`Error finding schedule conflicts: ${error.message}`);
    throw error;
  }
};

/**
 * Get all upcoming trainings
 * @returns {Promise<Array>} Array of upcoming trainings
 */
const getUpcomingTrainings = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trainings = await prisma.training.findMany({
      where: {
        date: {
          gte: today
        }
      },
      include: {
        participants: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    return trainings;
  } catch (error) {
    logger.error(`Error getting upcoming trainings: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a training by ID
 * @param {Number|String} trainingId - Training ID to delete
 * @returns {Promise<Object>} Deleted training
 */
const deleteTraining = async (trainingId) => {
  try {
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    // Verify training exists
    const existing = await prisma.training.findUnique({
      where: { id: numericTrainingId }
    });
    
    if (!existing) {
      throw new Error(`Training with ID ${numericTrainingId} not found`);
    }
    
    logger.info(`Deleting training ${numericTrainingId}`);
    
    // Delete training (participants will be deleted via CASCADE)
    return await prisma.training.delete({
      where: { id: numericTrainingId }
    });
  } catch (error) {
    logger.error(`Error deleting training: ${error.message}`);
    throw error;
  }
};

/**
 * Count all trainings
 * @returns {Promise<Number>} Count of all trainings
 */
const countAllTrainings = async () => {
  try {
    return await prisma.training.count();
  } catch (error) {
    logger.error(`Error counting trainings: ${error.message}`);
    throw error;
  }
};

/**
 * Record that a reminder was sent to a training participant
 * @param {Number|String} trainingId - Training ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
const recordReminderSent = async (trainingId, userId) => {
  try {
    // Ensure trainingId is a number
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    logger.info(`Recording reminder sent for training ${numericTrainingId}, user ${userId}`);
    
    // Use camelCase 'remindedAt' for Prisma (not snake_case 'reminded_at')
    const result = await prisma.trainingParticipant.updateMany({
      where: {
        trainingId: numericTrainingId,
        userId: userId
      },
      data: {
        remindedAt: new Date() // Use camelCase to match Prisma schema
      }
    });
    
    if (result.count > 0) {
      logger.info(`✓ Successfully recorded reminder status for training ${numericTrainingId}, user ${userId}`);
      return true;
    } else {
      logger.warn(`Failed to record reminder status: No matching record found for training ${numericTrainingId}, user ${userId}`);
      
      // Get participant record for debugging
      const participant = await prisma.trainingParticipant.findFirst({
        where: {
          trainingId: numericTrainingId,
          userId: userId
        }
      });
      
      if (participant) {
        logger.debug(`Participant exists but update failed. Current remindedAt: ${participant.remindedAt}`);
      } else {
        logger.debug(`No participant record found for training ${numericTrainingId}, user ${userId}`);
      }
      
      return false;
    }
  } catch (error) {
    logger.error(`Error recording reminder sent: ${error.message}`);
    return false;
  }
};

/**
 * Get training details by ID
 * @param {Number|String} trainingId - Training ID
 * @returns {Promise<Object|null>} Training object with participants
 */
const getTrainingById = async (trainingId) => {
  try {
    // Ensure trainingId is a number
    const numericTrainingId = typeof trainingId === 'string' ? parseInt(trainingId, 10) : trainingId;
    
    const training = await prisma.training.findUnique({
      where: {
        id: numericTrainingId
      },
      include: {
        participants: true
      }
    });
    
    if (training) {
      // Log raw time values for debugging
      logger.debug(`Retrieved training ${training.id} - Raw start_time: ${training.start_time}, end_time: ${training.end_time}`);
    } else {
      logger.warn(`No training found with ID ${numericTrainingId}`);
    }
    
    return training;
  } catch (error) {
    logger.error(`Error getting training by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Get trainings that need reminders sent
 * @returns {Promise<Array>} Array of trainings with participants needing reminders
 */
const getTrainingsForReminders = async () => {
  try {
    // Get current time
    const now = new Date();
    
    // Calculate date range: from today to 48 hours in the future
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start of today
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 2); // End of day after tomorrow
    endDate.setHours(23, 59, 59, 999);
    
    // Calculate reminder cutoff time (24 hours ago)
    const reminderCutoff = new Date(now);
    reminderCutoff.setHours(now.getHours() - 24);
    
    logger.info(`Finding trainings from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    logger.info(`Reminder cutoff: ${reminderCutoff.toISOString()} (24 hours ago)`);
    
    // Find trainings within date range
    const trainings = await prisma.training.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        participants: true
      },
      orderBy: [
        { date: 'asc' },
        { start_time: 'asc' }
      ]
    });
    
    logger.info(`Found ${trainings.length} upcoming trainings within date range`);
    
    // Filter out trainings with no participants
    const trainingsWithParticipants = trainings.filter(training => 
      training.participants && training.participants.length > 0
    );
    
    // For each training, get participants that need reminders
    const trainingsWithReminders = trainingsWithParticipants.map(training => {
      // Filter participants who need reminders (never reminded or reminded > 24 hours ago)
      const participantsNeedingReminder = training.participants.filter(participant => {
        return !participant.remindedAt || new Date(participant.remindedAt) < reminderCutoff;
      });
      
      return {
        ...training,
        participantsNeedingReminder
      };
    });
    
    // Filter out trainings with no participants needing reminders
    const result = trainingsWithReminders.filter(training => 
      training.participantsNeedingReminder && training.participantsNeedingReminder.length > 0
    );
    
    logger.info(`After filtering by reminder status: ${result.length} trainings have participants needing reminders`);
    
    return result;
  } catch (error) {
    logger.error(`Error getting trainings for reminders: ${error.message}`);
    throw error;
  }
};

/**
 * Count all trainings grouped by division
 * @returns {Promise<Array>} Array of divisionId and count pairs
 */
const countTrainingsByAllDivisions = async () => {
  try {
    // Menggunakan Prisma untuk mengelompokkan training berdasarkan divisionId
    const result = await prisma.training.groupBy({
      by: ['divisionId'],
      _count: {
        id: true
      }
    });

    // Format hasil untuk respons API
    return result.map((item) => ({
      divisionId: item.divisionId,
      count: item._count.id
    }));
  } catch (error) {
    logger.error(`Error counting trainings by all divisions: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createTraining,
  getTrainingById,
  addParticipant,
  addMultipleParticipants,
  getTrainingParticipants,
  recordPresence,
  findScheduleConflict,
  getTrainingsForReminders,
  recordReminderSent,
  countAllTrainings,
  getUpcomingTrainings,
  deleteTraining,
  forceAddDivisionMembers,
  countTrainingsByAllDivisions
};