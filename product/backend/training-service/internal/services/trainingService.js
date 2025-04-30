const trainingRepository = require('../repositories/trainingRepo');
const logger = require('../logger');
const axios = require('axios');
const userApiClient = require('../utils/userApiClient');
const { formatDateToIndonesian, formatTimeToWIB } = require('../utils/dateUtils');

// Create a new training
const createTraining = async (trainingData, userId) => {
  try {
    // Validate time ranges first
    const startTime = trainingData.start_time;
    const endTime = trainingData.end_time;
    
    // Basic validation - ensure end_time is after start_time
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    if (endMinutes <= startMinutes) {
      throw new Error('End time must be after start time');
    }
    
    // Create the training
    const training = await trainingRepository.createTraining({
      title: trainingData.title,
      date: trainingData.date,
      start_time: startTime,
      end_time: endTime,
      location: trainingData.location,
      created_by: userId,
      division_id: trainingData.division_id
    });
    
    logger.info(`Training created: ID ${training.id}, Division ${trainingData.division_id}`);
    
    // Automatically add all division members as participants
    await addDivisionMembers(training.id, trainingData.division_id);
    
    // Get complete training details with participants
    return getTrainingDetails(training.id);
  } catch (error) {
    logger.error(`Error in createTraining service: ${error.message}`);
    throw error;
  }
};

// Get training details by ID
const getTrainingDetails = async (id) => {
  try {
    // Get training data
    const training = await trainingRepository.getTrainingById(id);
    
    if (!training) {
      return null;
    }
    
    // Get participants
    const participants = await trainingRepository.getTrainingParticipants(id);
    
    // Format data for response
    return {
      id: training.id,
      title: training.title,
      date: training.date,
      start_time: training.start_time,
      end_time: training.end_time,
      location: training.location,
      createdBy: training.created_by,
      createdAt: training.created_at,
      divisionId: training.division_id,
      participants: participants || []
    };
  } catch (error) {
    logger.error(`Error in getTrainingDetails service: ${error.message}`);
    throw error;
  }
};

// Add participants to training
const addParticipants = async (trainingId, userIds) => {
  try {
    if (!trainingId || isNaN(trainingId)) {
      throw new Error('Invalid training ID');
    }
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs must be provided as an array');
    }
    
    logger.info(`Adding ${userIds.length} participants to training ${trainingId}`);
    
    // Add participants
    const participants = await trainingRepository.addMultipleParticipants(trainingId, userIds);
    
    return participants;
  } catch (error) {
    logger.error(`Error adding participants: ${error.message}`);
    throw error;
  }
};

// Add all division members to a training
const addDivisionMembers = async (trainingId, divisionId) => {
  try {
    logger.info(`Adding members from division ${divisionId} to training ${trainingId}`);
    
    // Get division members
    const divisionUsers = await userApiClient.getUsersByDivision(divisionId);
    logger.info(`Retrieved ${divisionUsers?.length || 0} users from division ${divisionId}`);
    
    if (!divisionUsers || !Array.isArray(divisionUsers) || divisionUsers.length === 0) {
      logger.warn(`No users found in division ${divisionId}`);
      return { added: 0, participants: [] };
    }
    
    // Extract user IDs and ensure they're valid
    const userIds = divisionUsers
      .filter(user => user && (user.user_id || user.id))
      .map(user => user.user_id || user.id);
    
    logger.info(`Extracted ${userIds.length} valid user IDs from division ${divisionId}`);
    
    // Add participants
    const participants = await trainingRepository.addMultipleParticipants(trainingId, userIds);
    
    return { 
      added: userIds.length, 
      participants: participants.map(p => ({ id: p.id, userId: p.userId }))
    };
  } catch (error) {
    logger.error(`Error adding division members: ${error.message}`);
    throw error;
  }
};

// Force add division members to a training (ignores any errors)
const forceAddDivisionMembers = async (trainingId, divisionId) => {
  try {
    logger.info(`Force adding members from division ${divisionId} to training ${trainingId}`);
    
    // Get division members - need to use userApiClient
    const divisionUsers = await userApiClient.getUsersByDivision(divisionId);
    logger.info(`Retrieved ${divisionUsers?.length || 0} users from division ${divisionId}`);
    
    if (!divisionUsers || !Array.isArray(divisionUsers) || divisionUsers.length === 0) {
      logger.warn(`No users found in division ${divisionId}`);
      return [];
    }
    
    // Extract user IDs and ensure they're valid
    const userIds = divisionUsers
      .filter(user => user && (user.user_id || user.id))
      .map(user => user.user_id || user.id);
    
    logger.info(`Extracted ${userIds.length} valid user IDs from division ${divisionId}`);
    
    // Force add participants ignoring errors for duplicates
    return await trainingRepository.forceAddDivisionMembers(trainingId, userIds);
  } catch (error) {
    logger.error(`Error force adding division members: ${error.message}`);
    throw error;
  }
};

// Record presence for training participant
const recordPresence = async (trainingId, userId, present) => {
  try {
    // Check if user is a participant
    const participants = await trainingRepository.getTrainingParticipants(trainingId);
    
    const isParticipant = participants.some(p => p.userId === userId);
    
    if (!isParticipant) {
      throw new Error('User is not a participant of this training');
    }
    
    // Record presence
    return await trainingRepository.recordPresence(trainingId, userId, present);
  } catch (error) {
    logger.error(`Error in recordPresence service: ${error.message}`);
    throw error;
  }
};

// Check for scheduling conflicts
const checkScheduleConflict = async (date, startTime, endTime) => {
  try {
    // Check for conflicts in the training service
    return await trainingRepository.findScheduleConflict(date, startTime, endTime);
  } catch (error) {
    logger.error(`Error in checkScheduleConflict service: ${error.message}`);
    throw error;
  }
};

/**
 * Send reminder for a specific training
 * @param {Object} training - Training object with participants
 * @returns {Object} Result object with count and failed stats
 */
const sendReminderForTraining = async (training) => {
  try {
    if (!training) {
      throw new Error('Training not provided');
    }
    
    logger.info(`Processing reminders for training: ${training.id} - ${training.title} on ${training.date.toISOString()} at ${training.start_time}`);
    
    // Handle participantsNeedingReminder if present
    const participants = training.participantsNeedingReminder || training.participants;
    
    // Validate participants
    if (!participants || participants.length === 0) {
      logger.info(`Training ${training.id} has no participants needing reminders, skipping`);
      return { success: true, count: 0, failed: 0 };
    }
    
    // Check date and time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const trainingDate = new Date(training.date);
    trainingDate.setHours(0, 0, 0, 0);
    
    // Format date using Indonesian format
    const formattedDate = formatDateToIndonesian(trainingDate);
    
    // Format time properly - IMPORTANT FIX FOR TIME DISPLAY
    // Log raw start_time value for debugging
    logger.debug(`Raw start_time for training ${training.id}: ${training.start_time}, type: ${typeof training.start_time}`);
    
    // Format time using the improved formatter
    const formattedTime = formatTimeToWIB(training.start_time);
    logger.info(`Formatted time for training ${training.id}: ${formattedTime}`);
    
    // Email batch for all participants
    const emailBatch = [];
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';
    
    let remindersSent = 0;
    let remindersFailed = 0;
    
    // Prepare data for each participant
    for (const participant of participants) {
      try {
        // Skip if already reminded within 24 hours (unless force reminder)
        if (participant.remindedAt && !training.forceReminder) {
          const reminderTime = new Date(participant.remindedAt);
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          if (reminderTime > twentyFourHoursAgo) {
            logger.info(`Skipping reminder for user ${participant.userId} - already reminded at ${reminderTime.toISOString()}`);
            continue;
          }
        }
        
        // Get user email
        const userEmail = await userApiClient.getUserEmail(participant.userId);
        
        if (!userEmail) {
          logger.warn(`No email found for user ${participant.userId}, skipping reminder`);
          remindersFailed++;
          continue;
        }
        
        logger.info(`Preparing reminder for ${userEmail} (user ${participant.userId})`);
        
        // Determine if today or tomorrow for better email subject
        const isToday = trainingDate.toDateString() === today.toDateString();
        const isTomorrow = trainingDate.toDateString() === tomorrow.toDateString();
        
        // Add to batch - using proper field names
        emailBatch.push({
          email: userEmail,
          user_id: participant.userId,
          training_id: training.id,
          training_title: training.title,
          training_date: formattedDate,
          training_time: formattedTime, // Now properly formatted
          training_location: training.location || 'Lokasi belum ditentukan',
          division_id: training.divisionId,
          is_today: isToday,
          is_tomorrow: isTomorrow
        });
      } catch (error) {
        logger.error(`Error preparing reminder for user ${participant.userId}: ${error.message}`);
        remindersFailed++;
      }
    }
    
    logger.info(`Prepared ${emailBatch.length} reminders to send`);
    
    // Send emails if any
    if (emailBatch.length > 0) {
      // Send individually to avoid batch issues
      for (const item of emailBatch) {
        try {
          logger.info(`Sending reminder to ${item.email} for training ${training.id}`);
          
          const response = await axios.post(
            `${emailServiceUrl}/api/email/training-reminder`,
            item,
            { 
              timeout: 8000,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data && response.data.success) {
            // IMPORTANT: Record reminder as sent using remindedAt field
            const recordSuccess = await trainingRepository.recordReminderSent(training.id, item.user_id);
            
            if (recordSuccess) {
              remindersSent++;
              logger.info(`✓ Successfully sent and recorded reminder to ${item.email} for training ${training.id}`);
            } else {
              logger.warn(`Reminder sent to ${item.email} but failed to record status`);
              remindersFailed++;
            }
          } else {
            logger.warn(`Email service returned non-success response for user ${item.user_id}`);
            remindersFailed++;
          }
          
          // Delay 500ms to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          logger.error(`Error sending reminder to ${item.email}: ${error.message}`);
          remindersFailed++;
        }
      }
    }
    
    logger.info(`Training ${training.id} reminder processing completed: Sent ${remindersSent}, Failed ${remindersFailed}`);
    return { 
      success: true, 
      count: remindersSent, 
      failed: remindersFailed,
      trainingId: training.id,
      trainingTitle: training.title
    };
  } catch (error) {
    logger.error(`Error in sendReminderForTraining service: ${error.message}`);
    throw error;
  }
};

// Check if a user is Kadiv (moved to userApiClient, but kept here for legacy API compatibility)
const isUserKadiv = async (userId, divisionId) => {
  return await userApiClient.isUserKadiv(userId, divisionId);
};

// Perbaiki fungsi formatTrainingResponse untuk time formatting yang konsisten
const formatTrainingResponse = (training) => {
  // Deep clone object untuk menghindari mutasi
  const formattedTraining = JSON.parse(JSON.stringify(training));
  
  // Format date ke YYYY-MM-DD
  if (formattedTraining.date) {
    const date = new Date(formattedTraining.date);
    formattedTraining.date = date.toISOString().split('T')[0]; // '2025-04-02'
  }
  
  // Format start_time ke HH:MM
  if (formattedTraining.start_time) {
    let startTime;
    if (typeof formattedTraining.start_time === 'string') {
      if (formattedTraining.start_time.includes('T')) {
        startTime = new Date(formattedTraining.start_time);
      } else if (formattedTraining.start_time.includes(':') || formattedTraining.start_time.includes('.')) {
        const parts = formattedTraining.start_time.includes(':') ? 
          formattedTraining.start_time.split(':') : 
          formattedTraining.start_time.split('.');
        formattedTraining.start_time = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        // lanjutkan, jangan return di sini
      }
    } else if (formattedTraining.start_time instanceof Date) {
      startTime = formattedTraining.start_time;
    }
    if (startTime) {
      const hours = String(startTime.getHours()).padStart(2, '0');
      const minutes = String(startTime.getMinutes()).padStart(2, '0');
      formattedTraining.start_time = `${hours}:${minutes}`;
    }
  }
  
  // Format end_time ke HH:MM
  if (formattedTraining.end_time) {
    let endTime;
    if (typeof formattedTraining.end_time === 'string') {
      if (formattedTraining.end_time.includes('T')) {
        endTime = new Date(formattedTraining.end_time);
      } else if (formattedTraining.end_time.includes(':') || formattedTraining.end_time.includes('.')) {
        const parts = formattedTraining.end_time.includes(':') ? 
          formattedTraining.end_time.split(':') : 
          formattedTraining.end_time.split('.');
        formattedTraining.end_time = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        // lanjutkan, jangan return di sini
      }
    } else if (formattedTraining.end_time instanceof Date) {
      endTime = formattedTraining.end_time;
    }
    if (endTime) {
      const hours = String(endTime.getHours()).padStart(2, '0');
      const minutes = String(endTime.getMinutes()).padStart(2, '0');
      formattedTraining.end_time = `${hours}:${minutes}`;
    }
  }
  
  // Format participants jika ada
  if (formattedTraining.participants && Array.isArray(formattedTraining.participants)) {
    formattedTraining.participants = formattedTraining.participants.map(participant => {
      const formattedParticipant = { ...participant };
      
      // Format joinedAt jika ada
      if (formattedParticipant.joinedAt) {
        formattedParticipant.joinedAt = new Date(formattedParticipant.joinedAt).toISOString();
      }
      
      // Format remindedAt jika ada
      if (formattedParticipant.remindedAt) {
        formattedParticipant.remindedAt = new Date(formattedParticipant.remindedAt).toISOString();
      }
      
      return formattedParticipant;
    });
  }
  
  return formattedTraining;
};

/**
 * Get all upcoming trainings (that haven't passed yet)
 * @returns {Promise<Array>} - Array of upcoming formatted trainings
 */
const getUpcomingTrainings = async () => {
  try {
    const trainings = await trainingRepository.getUpcomingTrainings();
    
    // Get current time for filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filter and format trainings
    const formattedTrainings = trainings.map(training => {
      const trainingDate = new Date(training.date);
      const isToday = trainingDate.getTime() === today.getTime();
      
      // For today's trainings, check if they haven't ended yet
      if (isToday) {
        const endTime = new Date(training.end_time);
        if (endTime < now) {
          return null; // Skip ended trainings
        }
      }
      
      return {
        id: training.id,
        title: training.title,
        date: training.date,
        start_time: training.start_time,
        end_time: training.end_time,
        location: training.location,
        createdBy: training.created_by,
        createdAt: training.created_at,
        divisionId: training.division_id,
        participants: training.participants || []
      };
    }).filter(training => training !== null); // Remove null entries
    
    return formattedTrainings;
  } catch (error) {
    logger.error(`Error in getUpcomingTrainings service: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a training by ID
 * @param {number} trainingId - The ID of the training to delete
 * @param {string} userId - The ID of the user performing the deletion
 * @returns {Promise<Object>} - Deletion result
 */
const deleteTraining = async (trainingId, userId) => {
  try {
    // First, check if the training exists
    const training = await getTrainingDetails(trainingId);
    
    if (!training) {
      throw new Error(`Training with ID ${trainingId} not found`);
    }
    
    // Check authorization - only creator or KADIVs can delete
    const isCreator = training.createdBy === userId;
    let isAuthorized = isCreator;
    
    if (!isCreator) {
      // Check if user is KADIV of training's division OR KADIV HD
      const isKadiv = await userApiClient.isUserKadiv(userId, training.divisionId);
      const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');
      isAuthorized = isKadiv || isHdKadiv;
    }
    
    if (!isAuthorized) {
      throw new Error('Not authorized to delete this training');
    }
    
    // Delete the training
    const deletedTraining = await trainingRepository.deleteTraining(trainingId);
    
    logger.info(`Training ${trainingId} deleted by user ${userId}`);
    
    return { success: true, training: deletedTraining };
  } catch (error) {
    logger.error(`Error in deleteTraining service: ${error.message}`);
    throw error;
  }
};

/**
 * Send training reminders for all upcoming trainings
 * @returns {Object} Result object with count and failed stats
 */
const sendTrainingReminders = async () => {
  try {
    const trainings = await trainingRepository.getTrainingsForReminders();
    
    if (!trainings || trainings.length === 0) {
      logger.info('No trainings with unreminded participants found in the next 48 hours');
      return { count: 0, failed: 0 };
    }
    
    logger.info(`Found ${trainings.length} trainings with participants needing reminders`);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    // Email service URL
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';
    
    // Process each training
    for (const training of trainings) {
      try {
        logger.info(`Processing reminders for training ${training.id}: ${training.title}`);
        
        // Check if we have participants needing reminders
        if (!training.participantsNeedingReminder || training.participantsNeedingReminder.length === 0) {
          logger.info(`No participants need reminders for training ${training.id}`);
          continue;
        }
        
        // Format date and time
        const trainingDate = new Date(training.date);
        const formattedDate = formatDateToIndonesian(trainingDate);
        
        // Determine if training is today or tomorrow
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const isToday = trainingDate.getTime() === today.getTime();
        const isTomorrow = trainingDate.getTime() === tomorrow.getTime();
        
        // Process each participant
        for (const participant of training.participantsNeedingReminder) {
          try {
            // Get user email
            const userEmail = await userApiClient.getUserEmail(participant.userId);
            
            if (!userEmail) {
              logger.warn(`No email found for user ${participant.userId}, skipping reminder`);
              totalFailed++;
              continue;
            }
            
            // Format time properly
            const formattedTime = formatTimeToWIB(training.start_time);
            
            // Prepare reminder data
            const reminderData = {
              email: userEmail,
              user_id: participant.userId,
              training_id: training.id,
              training_title: training.title,
              training_date: formattedDate,
              training_time: formattedTime,
              training_location: training.location || 'Lokasi belum ditentukan',
              is_today: isToday,
              is_tomorrow: isTomorrow
            };
            
            // Send reminder
            const response = await axios.post(
              `${emailServiceUrl}/api/email/training-reminder`,
              reminderData,
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            if (response.data && response.data.success) {
              // Record that reminder was sent
              await trainingRepository.recordReminderSent(training.id, participant.userId);
              totalSent++;
              logger.info(`✓ Successfully sent reminder to ${userEmail} for training ${training.id}`);
            } else {
              totalFailed++;
              logger.warn(`Failed to send reminder to ${userEmail} for training ${training.id}`);
            }
          } catch (error) {
            logger.error(`Error sending reminder to ${participant.userId}: ${error.message}`);
            totalFailed++;
          }
          
          // Add delay to prevent overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (trainingError) {
        logger.error(`Error processing training ${training.id}: ${trainingError.message}`);
        totalFailed += (training.participantsNeedingReminder?.length || 0);
      }
    }
    
    logger.info(`Training reminder processing completed: Sent ${totalSent}, Failed ${totalFailed}`);
    return { count: totalSent, failed: totalFailed };
  } catch (error) {
    logger.error(`Error in sendTrainingReminders: ${error.message}`);
    throw error;
  }
};

/**
 * Get count of trainings for all divisions
 * @returns {Promise<Array>} Array of objects with divisionId, count, and division details if available
 */
const getTrainingsCountByAllDivisions = async () => {
  try {
    logger.info('Getting training counts by all divisions');
    
    // Get raw counts by division from repository
    const divisionCounts = await trainingRepository.countTrainingsByAllDivisions();
    
    if (!divisionCounts || !Array.isArray(divisionCounts)) {
      logger.error('Invalid response from countTrainingsByAllDivisions');
      return [];
    }
    
    logger.info(`Received counts for ${divisionCounts.length} divisions`);
    
    // Optionally: Enrich with division details if needed
    const enrichedCounts = await Promise.all(
      divisionCounts.map(async (item) => {
        try {
          // Get division details from Auth Service
          const divisionDetails = await userApiClient.getDivisionDetails(item.divisionId);
          
          return {
            ...item,
            division: divisionDetails || { name: `Division ${item.divisionId}` }
          };
        } catch (error) {
          logger.warn(`Could not get details for division ${item.divisionId}: ${error.message}`);
          return {
            ...item,
            division: { name: `Division ${item.divisionId}` }
          };
        }
      })
    );
    
    return enrichedCounts;
  } catch (error) {
    logger.error(`Error getting trainings count by all divisions: ${error.message}`);
    return []; // Return empty array instead of throwing to avoid cascading errors
  }
};

module.exports = {
  createTraining,
  getTrainingDetails,
  addParticipants,
  addDivisionMembers,
  forceAddDivisionMembers,
  recordPresence,
  isUserKadiv,
  checkScheduleConflict,
  getUpcomingTrainings,
  deleteTraining,
  sendReminderForTraining,
  sendTrainingReminders,
  getTrainingsCountByAllDivisions
};