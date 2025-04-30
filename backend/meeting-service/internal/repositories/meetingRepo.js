const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../logger');

/**
 * Generate a unique code for meeting join
 * @returns {string} Unique 6-character code
 */
const generateUniqueCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Create a new meeting
 * @param {Object} meetingData - Meeting data
 * @returns {Promise<Object>} Created meeting
 */
const createMeeting = async (meetingData) => {
  try {
    const {
      title,
      date,
      startTime,     
      endTime,      
      location,
      createdBy,
      joinCode = generateUniqueCode()
    } = meetingData;
    
    // Validate required fields
    if (!title) throw new Error('Title is required');
    if (!date) throw new Error('Date is required');
    if (!startTime) throw new Error('Start time is required');
    if (!endTime) throw new Error('End time is required');
    if (!createdBy) throw new Error('Creator ID is required');
    if (!joinCode) throw new Error('Join code is required');
    
    // Parse meeting date to Date object
    const meetingDate = new Date(date);
    
    // Parse start time with robust handling
    let startHours = 0, startMinutes = 0;
    if (typeof startTime === 'string') {
      const parts = startTime.includes(':') ? startTime.split(':') : startTime.split('.');
      if (parts.length < 2) {
        throw new Error(`Invalid start time format: ${startTime}. Expected HH:MM or HH.MM`);
      }
      startHours = parseInt(parts[0], 10);
      startMinutes = parseInt(parts[1], 10);
    } else if (startTime instanceof Date) {
      startHours = startTime.getHours();
      startMinutes = startTime.getMinutes();
    } else {
      throw new Error(`Unsupported start time format: ${typeof startTime}`);
    }
    
    // Parse end time with robust handling
    let endHours = 0, endMinutes = 0;
    if (typeof endTime === 'string') {
      const parts = endTime.includes(':') ? endTime.split(':') : endTime.split('.');
      if (parts.length < 2) {
        throw new Error(`Invalid end time format: ${endTime}. Expected HH:MM or HH.MM`);
      }
      endHours = parseInt(parts[0], 10);
      endMinutes = parseInt(parts[1], 10);
    } else if (endTime instanceof Date) {
      endHours = endTime.getHours();
      endMinutes = endTime.getMinutes();
    } else {
      throw new Error(`Unsupported end time format: ${typeof endTime}`);
    }
    
    // Create full Date objects with the correct meeting date (avoiding 1970 epoch issue)
    const fullStartTime = new Date(meetingDate);
    fullStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const fullEndTime = new Date(meetingDate);
    fullEndTime.setHours(endHours, endMinutes, 0, 0);
    
    // Validate end time is after start time
    if (fullEndTime <= fullStartTime) {
      throw new Error('End time must be after start time');
    }
    
    logger.debug(`Creating meeting with date=${meetingDate.toISOString()}, start=${fullStartTime.toISOString()}, end=${fullEndTime.toISOString()}`);
    
    // Create meeting in database using camelCase field names that match Prisma schema
    const result = await prisma.meeting.create({
      data: {
        title,
        date: meetingDate,
        startTime: fullStartTime,
        endTime: fullEndTime,
        location,
        joinCode,
        createdBy,
        createdAt: new Date()
      }
    });
    
    return result;
  } catch (error) {
    logger.error(`Error creating meeting: ${error.message}`);
    throw error;
  }
};

/**
 * Get meeting details by ID with participants
 * @param {Number|String} meetingId - The meeting ID
 * @returns {Promise<Object|null>} Meeting object with participants
 */
const getMeetingById = async (meetingId) => {
  try {
    // Ensure meetingId is a number
    const numericMeetingId = typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId;
    
    if (isNaN(numericMeetingId)) {
      throw new Error(`Invalid meeting ID format: ${meetingId}`);
    }
    
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: numericMeetingId
      },
      include: {
        participants: true
      }
    });
    
    if (meeting) {
      logger.debug(`Retrieved meeting ${meeting.id} - Raw startTime: ${meeting.startTime}, endTime: ${meeting.endTime}`);
    } else {
      logger.warn(`Meeting not found with ID: ${numericMeetingId}`);
    }
    
    return meeting;
  } catch (error) {
    logger.error(`Error getting meeting by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Get meeting by join code
 * @param {String} joinCode - Meeting join code
 * @returns {Promise<Object|null>} Meeting object
 */
const getMeetingByJoinCode = async (joinCode) => {
  try {
    if (!joinCode || typeof joinCode !== 'string') {
      throw new Error('Valid join code is required');
    }
    
    const meeting = await prisma.meeting.findUnique({
      where: { joinCode }
    });
    
    if (!meeting) {
      logger.warn(`No meeting found with join code: ${joinCode}`);
    }
    
    return meeting;
  } catch (error) {
    logger.error(`Error getting meeting by join code: ${error.message}`);
    throw error;
  }
};

/**
 * Add a participant to a meeting
 * @param {Number|String} meetingId - Meeting ID
 * @param {String} userId - User ID to add as participant
 * @returns {Promise<Object>} Result with participant data and join status
 */
const addParticipant = async (meetingId, userId) => {
  try {
    if (!meetingId) throw new Error('Meeting ID is required');
    if (!userId) throw new Error('User ID is required');
    
    const numericMeetingId = typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId;
    
    logger.info(`Adding participant ${userId} to meeting ${numericMeetingId}`);
    
    // Menggunakan transaction untuk menghindari race condition
    return await prisma.$transaction(async (tx) => {
      // Cek apakah meeting masih ada (untuk menghindari foreign key error)
      const meetingExists = await tx.meeting.findUnique({
        where: { id: numericMeetingId },
        select: { id: true }
      });
      
      if (!meetingExists) {
        throw new Error(`Meeting with ID ${numericMeetingId} not found`);
      }
      
      // Use upsert to prevent duplicates
      const result = await tx.meetingParticipant.upsert({
        where: {
          meetingId_userId: {
            meetingId: numericMeetingId,
            userId: userId
          }
        },
        update: {}, // No updates if already exists
        create: {
          meetingId: numericMeetingId,
          userId: userId,
          joinedAt: new Date(),
          remindedAt: null // Ensure null for future reminders
        }
      });
      
      // Check if this was an existing participant (joined more than 5 seconds ago)
      const alreadyJoined = result.joinedAt && 
                            result.joinedAt < new Date(Date.now() - 5000);
      
      return { 
        alreadyJoined, 
        participant: result 
      };
    }, {
      // Add transaction options for better reliability
      timeout: 10000 // 10 second timeout
    });
  } catch (error) {
    logger.error(`Error adding participant to meeting: ${error.message}`);
    throw error;
  }
};

/**
 * Get participants for a meeting
 * @param {Number|String} meetingId - Meeting ID
 * @returns {Promise<Array>} Array of participants
 */
const getMeetingParticipants = async (meetingId) => {
  try {
    const numericMeetingId = typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId;
    
    return await prisma.meetingParticipant.findMany({
      where: { meetingId: numericMeetingId },
      orderBy: { joinedAt: 'asc' }
    });
  } catch (error) {
    logger.error(`Error getting meeting participants: ${error.message}`);
    throw error;
  }
};

/**
 * Get all upcoming meetings (that haven't passed yet)
 * @returns {Promise<Array>} Array of upcoming meetings
 */
const getUpcomingMeetings = async () => {
  try {
    const now = new Date();
    const today = new Date(now.toISOString().split('T')[0]);
    
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          // Future dates
          { date: { gt: today } },
          // Today but not past meetings
          {
            date: { equals: today },
            startTime: { gte: now }
          }
        ]
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        participants: true
      }
    });
    
    logger.info(`Found ${meetings.length} upcoming meetings (including today's future meetings)`);
    return meetings;
  } catch (error) {
    logger.error(`Error getting upcoming meetings: ${error.message}`);
    throw error;
  }
};

/**
 * Check for schedule conflicts with existing meetings
 * @param {Date|String} date - Meeting date
 * @param {Date|String} startTime - Meeting start time
 * @param {Date|String} endTime - Meeting end time
 * @returns {Promise<Object|null>} Conflicting meeting or null if no conflict
 */
const findScheduleConflict = async (date, startTime, endTime) => {
  try {
    // Convert input to appropriate types
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Create full startTime Date object
    let startTimeObj;
    if (typeof startTime === 'string') {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      startTimeObj = new Date(dateObj);
      startTimeObj.setHours(startHour, startMinute, 0, 0);
    } else {
      startTimeObj = startTime;
    }
    
    // Create full endTime Date object
    let endTimeObj;
    if (typeof endTime === 'string') {
      const [endHour, endMinute] = endTime.split(':').map(Number);
      endTimeObj = new Date(dateObj);
      endTimeObj.setHours(endHour, endMinute, 0, 0);
    } else {
      endTimeObj = endTime;
    }
    
    // Find meetings on the same date
    const meetings = await prisma.meeting.findMany({
      where: { date: dateObj }
    });
    
    logger.info(`Checking ${meetings.length} meetings on ${dateObj.toISOString()} for time conflicts`);
    
    // Convert times to minutes for easier comparison
    const newStartMinutes = startTimeObj.getHours() * 60 + startTimeObj.getMinutes();
    const newEndMinutes = endTimeObj.getHours() * 60 + endTimeObj.getMinutes();
    
    // Check for overlaps with existing meetings
    for (const meeting of meetings) {
      const existingStartTime = meeting.startTime;
      const existingEndTime = meeting.endTime;
      
      const existingStartMinutes = existingStartTime.getHours() * 60 + existingStartTime.getMinutes();
      const existingEndMinutes = existingEndTime.getHours() * 60 + existingEndTime.getMinutes();
      
      logger.debug(`Comparing existing meeting ${meeting.id} (${existingStartMinutes}-${existingEndMinutes}) with new time (${newStartMinutes}-${newEndMinutes})`);
      
      // Check all possible overlap scenarios
      const hasOverlap = (
        // New meeting starts during existing meeting
        (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
        // New meeting ends during existing meeting
        (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
        // New meeting encompasses existing meeting
        (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes) ||
        // Existing meeting encompasses new meeting
        (existingStartMinutes <= newStartMinutes && existingEndMinutes >= newEndMinutes)
      );
      
      if (hasOverlap) {
        logger.warn(`Meeting conflict detected: New meeting (${newStartMinutes}-${newEndMinutes}) conflicts with existing meeting ${meeting.id} (${existingStartMinutes}-${existingEndMinutes})`);
        return meeting;
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
 * Delete a meeting by ID
 * @param {Number|String} meetingId - Meeting ID to delete
 * @returns {Promise<Object>} Deleted meeting
 */
const deleteMeeting = async (meetingId) => {
  try {
    const numericMeetingId = typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId;
    
    // First check if meeting exists
    const exists = await prisma.meeting.findUnique({
      where: { id: numericMeetingId },
      select: { id: true }
    });
    
    if (!exists) {
      throw new Error(`Meeting with ID ${numericMeetingId} not found`);
    }
    
    // Delete with cascade (will automatically delete participants)
    return await prisma.meeting.delete({
      where: { id: numericMeetingId }
    });
  } catch (error) {
    logger.error(`Error deleting meeting: ${error.message}`);
    throw error;
  }
};

/**
 * Get meetings that need reminders to be sent
 * @returns {Promise<Array>} Array of meetings with participants needing reminders
 */
const getMeetingsNeedingReminders = async () => {
  try {
    const now = new Date();
    
    // Calculate date ranges
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start of today
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 2); // End of day after tomorrow
    endDate.setHours(23, 59, 59, 999);
    
    // Calculate reminder cutoff (24 hours ago)
    const reminderCutoff = new Date(now);
    reminderCutoff.setHours(now.getHours() - 24);
    
    logger.info(`Finding meetings from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    logger.info(`Reminder cutoff: ${reminderCutoff.toISOString()} (24 hours ago)`);
    
    // Find all upcoming meetings
    const meetings = await prisma.meeting.findMany({
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
        { startTime: 'asc' }
      ]
    });
    
    logger.info(`Found ${meetings.length} upcoming meetings within date range`);
    
    // Process meetings to identify participants needing reminders
    const meetingsWithReminders = meetings
      // First filter out meetings with no participants
      .filter(meeting => meeting.participants && meeting.participants.length > 0)
      // Then add participantsNeedingReminder field to each meeting
      .map(meeting => {
        const participantsNeedingReminder = meeting.participants.filter(participant => 
          !participant.remindedAt || new Date(participant.remindedAt) < reminderCutoff
        );
        
        return {
          ...meeting,
          participantsNeedingReminder
        };
      })
      // Finally filter out meetings with no participants needing reminders
      .filter(meeting => 
        meeting.participantsNeedingReminder && 
        meeting.participantsNeedingReminder.length > 0
      );
    
    logger.info(`After filtering by reminder status: ${meetingsWithReminders.length} meetings have participants needing reminders`);
    
    return meetingsWithReminders;
  } catch (error) {
    logger.error(`Error getting meetings for reminders: ${error.message}`);
    throw error;
  }
};

/**
 * Record that a reminder was sent to a meeting participant
 * @param {Number|String} meetingId - Meeting ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
const recordReminderSent = async (meetingId, userId) => {
  try {
    // Ensure meetingId is a number
    const numericMeetingId = typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId;
    
    logger.info(`Recording reminder sent for meeting ${numericMeetingId}, user ${userId}`);
    
    // Update the participant record with current time as remindedAt
    const result = await prisma.meetingParticipant.updateMany({
      where: {
        meetingId: numericMeetingId,
        userId: userId
      },
      data: {
        remindedAt: new Date()
      }
    });
    
    if (result.count > 0) {
      logger.info(`✓ Successfully recorded reminder status for meeting ${numericMeetingId}, user ${userId}`);
      return true;
    } else {
      logger.warn(`Failed to record reminder status: No matching record found for meeting ${numericMeetingId}, user ${userId}`);
      
      // Try to get participant record for debugging
      const participant = await prisma.meetingParticipant.findFirst({
        where: {
          meetingId: numericMeetingId,
          userId: userId
        }
      });
      
      if (participant) {
        logger.debug(`Participant exists but update failed. Current remindedAt: ${participant.remindedAt}`);
      } else {
        logger.debug(`No participant record found for meeting ${numericMeetingId}, user ${userId}`);
      }
      
      return false;
    }
  } catch (error) {
    logger.error(`Error recording reminder sent: ${error.message}`);
    return false;
  }
};

module.exports = {
  createMeeting,
  getMeetingById,
  getMeetingByJoinCode,
  addParticipant,
  getMeetingParticipants,
  getUpcomingMeetings,
  findScheduleConflict,
  recordReminderSent,
  deleteMeeting,
  getMeetingsNeedingReminders
};