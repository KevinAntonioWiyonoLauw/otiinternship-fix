const crypto = require('crypto');
const axios = require('axios');
const meetingRepository = require('../repositories/meetingRepo');
const logger = require('../logger');
const { meetingReminderQueue } = require('../queues/index');
const { formatDateToIndonesian, formatTimeToWIB, formatTimeRangeToWIB } = require('../utils/dateUtils');
const userApiClient = require('../utils/userApiClient'); // Tambahkan impor userApiClient

// Generate a unique join code
const generateJoinCode = () => {
  // Generate a random string of characters
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();
  return code;
};

/**
 * Create a new meeting
 * @param {Object} meetingData - Meeting data
 * @returns {Promise<Object>} Created meeting
 */
const createMeeting = async (meetingData) => {
  try {
    const { title, date, startTime, endTime, location, createdBy } = meetingData;
    
    // Generate unique join code
    const joinCode = generateJoinCode();
    
    // Create meeting with consistent parameter names
    const meeting = await meetingRepository.createMeeting({
      title,
      date,
      startTime,  
      endTime,   
      location,
      createdBy,
      joinCode
    });
    
    logger.info(`Meeting created: ${meeting.id} by user ${createdBy}`);
    return meeting;
  } catch (error) {
    logger.error(`Error in createMeeting service: ${error.message}`);
    throw error;
  }
};

// Get service token for Auth Service
const getServiceToken = async () => {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';
    const response = await axios.post(`${authServiceUrl}/api/auth/service-login`, {
      service_key: process.env.SERVICE_AUTH_KEY || 'meeting-service-secret-key'
    });
    return response.data.token;
  } catch (error) {
    logger.error(`Failed to get service token: ${error.message}`);
    return null;
  }
};

/**
 * Get all upcoming meetings (that haven't passed yet)
 * @returns {Promise<Array>} - Array of upcoming formatted meetings
 */
const getUpcomingMeetings = async () => {
  try {
    const meetings = await meetingRepository.getUpcomingMeetings();
    const now = new Date();
    
    // Filter meeting untuk hari ini di sini, setelah dari database
    const filteredMeetings = meetings.filter(meeting => {
      // Untuk meeting hari ini, perlu memeriksa waktu
      if (meeting.date.toDateString() === now.toDateString()) {
        // Bandingkan dengan waktu saat ini
        const meetingTime = new Date(meeting.date);
        meetingTime.setHours(
          meeting.startTime.getHours(),
          meeting.startTime.getMinutes()
        );
        return meetingTime > now;
      }
      return true; // Semua meeting di masa depan tetap ditampilkan
    });
    
    logger.info(`Retrieved ${meetings.length} upcoming meetings, filtered to ${filteredMeetings.length}`);
    
    // Format each meeting response
    return filteredMeetings.map(meeting => formatMeetingResponse({
      ...meeting,
      participantCount: meeting.participants?.length || 0
    }));
  } catch (error) {
    logger.error(`Error in getUpcomingMeetings service: ${error.message}`);
    throw error;
  }
};

// Get user email from Auth Service
const getUserEmail = async (userId, retries = 3) => {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';
  let attempts = 0;
  
  const serviceToken = await getServiceToken();
  if (!serviceToken) {
    logger.error('Failed to obtain service token for auth service');
    return null;
  }
  
  while (attempts < retries) {
    try {
      const response = await axios.get(`${authServiceUrl}/api/users/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${serviceToken}`
        }
      });
      
      if (response.data && response.data.success && response.data.user && response.data.user.email) {
        return response.data.user.email;
      }
      throw new Error('Invalid response format from auth service');
    } catch (error) {
      attempts++;
      logger.warn(`Error getting user email (attempt ${attempts}/${retries}): ${error.message}`);
      if (attempts >= retries) {
        logger.error(`Failed to get email for user ${userId} after ${retries} attempts`);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

// Join a meeting using join code
const joinMeeting = async (joinCode, userId) => {
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      // Find meeting by join code
      const meeting = await meetingRepository.getMeetingByJoinCode(joinCode);
      
      if (!meeting) {
        logger.warn(`Invalid join code: ${joinCode}`);
        return { success: false, message: 'Invalid join code' };
      }
      
      // Add user as participant with retry mechanism
      const { alreadyJoined, participant } = await meetingRepository.addParticipant(meeting.id, userId);
      
      if (alreadyJoined) {
        logger.info(`User ${userId} already joined meeting ${meeting.id}`);
        return { success: true, meeting, alreadyJoined: true };
      }
      
      logger.info(`User ${userId} joined meeting ${meeting.id}`);
      return { success: true, meeting, alreadyJoined: false };
    } catch (error) {
      retries++;
      logger.error(`Error in joinMeeting service (attempt ${retries}/${maxRetries}): ${error.message}`);
      
      // If it's a connection error, wait and retry
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        logger.info(`Connection error, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (retries >= maxRetries) {
        // If not a connection error or max retries reached, rethrow
        throw error;
      } else {
        // For other errors on non-final retries, wait a bit and continue
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // If we've exhausted retries, throw a more helpful error
  throw new Error(`Failed to join meeting after ${maxRetries} attempts due to connection issues`);
};

// Get meeting details with participants
const getMeetingDetails = async (meetingId) => {
  try {
    const meeting = await meetingRepository.getMeetingById(meetingId);
    
    if (!meeting) {
      return null;
    }
    
    const participants = await meetingRepository.getMeetingParticipants(meetingId);
    
    return {
      ...meeting,
      participants
    };
  } catch (error) {
    logger.error(`Error in getMeetingDetails service: ${error.message}`);
    throw error;
  }
};

// Check for schedule conflicts
const checkScheduleConflict = async (date, startTime, endTime) => {
  try {
    // Normalize date and time for consistent comparison
    const formattedDate = new Date(date);
    
    // For time, create a full ISO date with the time component
    const startTimeInWIB = new Date(`1970-01-01T${startTime}+07:00`);
    const endTimeInWIB = new Date(`1970-01-01T${endTime}+07:00`);
    
    // Validate that end time is after start time
    if (endTimeInWIB <= startTimeInWIB) {
      throw new Error('End time must be after start time');
    }
    
    // Find any meeting that conflicts
    const conflict = await meetingRepository.findScheduleConflict(
      formattedDate,
      startTimeInWIB,
      endTimeInWIB
    );
    
    return conflict;
  } catch (error) {
    logger.error(`Error in checkScheduleConflict service: ${error.message}`);
    throw error;
  }
};

// Update formatMeetingResponse function
const formatMeetingResponse = (meeting) => {
  // Format tanggal untuk response yang konsisten
  const result = {
    id: meeting.id,
    title: meeting.title,
    date: meeting.date.toISOString().split('T')[0], // Format YYYY-MM-DD
    createdBy: meeting.createdBy || meeting.created_by,
    createdAt: (meeting.createdAt || meeting.created_at).toISOString(),
    location: meeting.location,
    joinCode: meeting.joinCode || meeting.join_code,
    participants: meeting.participants || [],
    participantCount: meeting.participantCount || meeting.participants?.length || 0
  };
  
  // Format waktu ke HH.MM
  if (meeting.startTime || meeting.start_time) {
    let startTime = meeting.startTime || meeting.start_time;
    if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }
    const hours = String(startTime.getHours()).padStart(2, '0');
    const minutes = String(startTime.getMinutes()).padStart(2, '0');
    result.startTime = `${hours}.${minutes}`;
  }
  
  if (meeting.endTime || meeting.end_time) {
    let endTime = meeting.endTime || meeting.end_time;
    if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }
    const hours = String(endTime.getHours()).padStart(2, '0');
    const minutes = String(endTime.getMinutes()).padStart(2, '0');
    result.endTime = `${hours}.${minutes}`;
  }
  
  return result;
};

/**
 * Delete a meeting by ID
 * @param {number} meetingId - The ID of the meeting to delete
 * @returns {Promise<object>} - Result of the operation
 */
const deleteMeeting = async (meetingId) => {
  try {
    logger.info(`Deleting meeting with ID: ${meetingId}`);
    
    // First, check if the meeting exists
    const meeting = await meetingRepository.getMeetingById(meetingId);
    
    if (!meeting) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }
    
    // Hapus semua reminder jobs untuk meeting ini dari queue jika ada
    const jobs = await meetingReminderQueue.getJobs(['waiting', 'delayed', 'active']);
    
    for (const job of jobs) {
      if (
        (job.name === 'single-meeting' && job.data.meetingId === meetingId) ||
        (job.name === 'check-reminders' && job.data.specificMeetingId === meetingId)
      ) {
        await job.remove();
        logger.info(`Removed reminder job ${job.id} for deleted meeting ${meetingId}`);
      }
    }
    
    // Delete meeting from database
    const deletedMeeting = await meetingRepository.deleteMeeting(meetingId);
    
    return { success: true, meeting: deletedMeeting };
  } catch (error) {
    logger.error(`Error in deleteMeeting service: ${error.message}`);
    throw error;
  }
};

/**
 * Mencoba mengirim reminder dengan mekanisme retry
 * @param {Object} reminderData - Data untuk reminder
 * @param {Number} maxRetries - Jumlah maksimum percobaan
 * @returns {Promise<Boolean>} - Status keberhasilan
 */
const sendReminderWithRetry = async (reminderData, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';
      const response = await axios.post(
        `${emailServiceUrl}/api/email/meeting-reminder`, 
        reminderData,
        { 
          timeout: 8000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (response.data && response.data.success) {
        return true;
      }
      
      logger.warn(`Email service returned unsuccessful response: ${JSON.stringify(response.data)}`);
      retries++;
    } catch (error) {
      retries++;
      logger.warn(`Email service retry ${retries}/${maxRetries}: ${error.message}`);
      if (retries >= maxRetries) return false;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
    }
  }
  
  return false;
};

/**
 * Send reminders for upcoming meetings
 * @returns {Object} Result with count of sent reminders
 */
const sendMeetingReminders = async () => {
  try {
    logger.info(`Current time: ${new Date().toISOString()}`);
    
    // Get meetings needing reminders
    const meetings = await meetingRepository.getMeetingsNeedingReminders();
    
    logger.info(`Found ${meetings.length} meetings with participants needing reminders`);
    
    let totalSent = 0;
    let totalSkipped = 0;
    
    for (const meeting of meetings) {
      logger.info(`Processing reminders for meeting: ${meeting.id} - ${meeting.title}`);
      
      // Format date and time
      const meetingDate = new Date(meeting.date);
      const formattedDate = formatDateToIndonesian(meetingDate);
      
      // Log raw time values for debugging
      logger.debug(`Meeting ${meeting.id} raw start_time: ${meeting.startTime || meeting.start_time}, end_time: ${meeting.endTime || meeting.end_time}`);
      
      // Format time properly without 1970 epoch date
      const startTime = formatTimeToWIB(meeting.startTime || meeting.start_time); 
      const endTime = formatTimeToWIB(meeting.endTime || meeting.end_time);
      const formattedTime = `${startTime} - ${endTime}`;
      
      logger.info(`Formatted date: ${formattedDate}, time range: ${formattedTime}`);
      
      // Track stats for this meeting
      let meetingSent = 0;
      let meetingSkipped = 0;
      
      // Process each participant
      for (const participant of meeting.participantsNeedingReminder) {
        try {
          // Get user email with getUserEmail instead of getUserById
          const userEmail = await getUserEmail(participant.userId);
          
          if (!userEmail) {
            logger.warn(`No valid email found for user ${participant.userId}, skipping reminder`);
            meetingSkipped++;
            continue;
          }
          
          logger.info(`Sending reminder to ${userEmail} for meeting ${meeting.id}`);
          
          // Create reminder data with correct field names
          const reminderData = {
            email: userEmail,
            user_id: participant.userId,
            meeting_id: meeting.id,
            meeting_title: meeting.title,
            meeting_date: formattedDate, 
            meeting_time: formattedTime,
            meeting_location: meeting.location || 'Lokasi belum ditentukan',
            join_code: meeting.joinCode || meeting.join_code
          };
          
          // Send the reminder email
          const success = await sendReminderWithRetry(reminderData);
          
          if (success) {
            // Mark reminder as sent using remindedAt field
            await meetingRepository.recordReminderSent(meeting.id, participant.userId);
            meetingSent++;
            logger.info(`✓ Successfully sent reminder to ${userEmail} for meeting ${meeting.id}`);
          } else {
            meetingSkipped++;
            logger.warn(`Failed to send reminder to ${userEmail} for meeting ${meeting.id}`);
          }
        } catch (error) {
          logger.error(`Error sending reminder to participant ${participant.userId}: ${error.message}`);
          meetingSkipped++;
        }
        
        // Tambahkan delay untuk menghindari rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      logger.info(`Meeting ${meeting.id} reminder processing completed: Sent ${meetingSent}, Skipped ${meetingSkipped}`);
      
      totalSent += meetingSent;
      totalSkipped += meetingSkipped;
    }
    
    logger.info(`Meeting reminder processing completed: Sent ${totalSent}, Skipped ${totalSkipped}`);
    return { count: totalSent, skipped: totalSkipped };
  } catch (error) {
    logger.error(`Error in sendMeetingReminders: ${error.message}`);
    throw error;
  }
};

/**
 * Send reminders for a specific meeting
 * @param {Object} meeting - Meeting object
 * @returns {Object} Result with count of sent reminders
 */
const sendReminderForMeeting = async (meeting) => {
  try {
    if (!meeting) {
      throw new Error('Meeting not provided');
    }
    
    logger.info(`Processing reminders for meeting: ${meeting.id} - ${meeting.title}`);
    
    // Get participants needing reminder
    const participantsToRemind = meeting.participantsNeedingReminder || meeting.participants || [];
    
    if (participantsToRemind.length === 0) {
      logger.info(`No participants need reminders for meeting ${meeting.id}`);
      return { sent: 0, skipped: 0 };
    }
    
    // Check if meeting is today or tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const meetingDate = new Date(meeting.date);
    meetingDate.setHours(0, 0, 0, 0);
    
    // Format date properly (Indonesian format)
    const formattedDate = formatDateToIndonesian(meetingDate);
    
    // Format time properly (WIB format)
    // Handle both camelCase and snake_case
    const startTimeVal = meeting.startTime || meeting.start_time;
    const endTimeVal = meeting.endTime || meeting.end_time;
    
    // Log raw times for debugging
    logger.debug(`Raw start_time: ${startTimeVal}, end_time: ${endTimeVal}`);
    
    const formattedTimeRange = formatTimeRangeToWIB(startTimeVal, endTimeVal);
    
    logger.info(`Formatted date: ${formattedDate}, time range: ${formattedTimeRange}`);
    
    // Email service URL
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';
    
    let remindersSent = 0;
    let remindersSkipped = 0;
    
    // Send email to each participant
    for (const participant of participantsToRemind) {
      try {
        // Get user email
        const userEmail = await getUserEmail(participant.userId);
        
        if (!userEmail) {
          logger.warn(`No email found for user ${participant.userId}, skipping reminder`);
          remindersSkipped++;
          continue;
        }
        
        logger.info(`Sending reminder to ${userEmail} for meeting ${meeting.id}`);
        
        // Send reminder to email service with correct field names
        const reminderData = {
          email: userEmail,
          user_id: participant.userId,
          meeting_id: meeting.id,
          meeting_title: meeting.title,
          meeting_date: formattedDate,
          meeting_time: formattedTimeRange,
          meeting_location: meeting.location || "Lokasi belum ditentukan",
          join_code: meeting.joinCode || meeting.join_code
        };
        
        // Use timeout for resilience
        const response = await axios.post(`${emailServiceUrl}/api/email/meeting-reminder`, reminderData, {
          timeout: 8000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data && response.data.success) {
          // Record that reminder was sent using remindedAt field
          const updated = await meetingRepository.recordReminderSent(meeting.id, participant.userId);
          
          if (updated) {
            remindersSent++;
            logger.info(`✓ Reminder status recorded for meeting ${meeting.id}, user ${participant.userId}`);
            logger.info(`Successfully sent reminder to ${userEmail} for meeting ${meeting.id}`);
          } else {
            logger.warn(`Failed to record reminder status for user ${participant.userId}`);
            remindersSkipped++;
          }
        } else {
          logger.warn(`Email service returned non-success response for user ${participant.userId}`);
          remindersSkipped++;
        }
      } catch (error) {
        logger.error(`Error sending reminder to participant ${participant.userId}: ${error.message}`);
        remindersSkipped++;
      }
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    logger.info(`Meeting ${meeting.id} reminder processing completed: Sent ${remindersSent}, Skipped ${remindersSkipped}`);
    return { count: remindersSent, skipped: remindersSkipped };
  } catch (error) {
    logger.error(`Error in sendReminderForMeeting: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
  getMeetingDetails,
  sendMeetingReminders,
  checkScheduleConflict,
  formatMeetingResponse,
  sendReminderForMeeting,
  deleteMeeting,
  getUpcomingMeetings,
  getUserEmail,
  sendReminderWithRetry
};