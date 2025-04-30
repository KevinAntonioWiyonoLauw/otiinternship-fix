const meetingService = require('../services/meetingService');
const logger = require('../logger');

/**
 * Process meeting reminders
 * @param {Object} job Bull job containing data
 * @returns {Object} Processing results
 */
const processMeetingReminders = async (job) => {
  try {
    logger.info(`Processing meeting reminders job ${job.id}`);
    
    // Update job progress
    await job.progress(10);
    
    // Fetch upcoming meetings and send reminders
    const result = await meetingService.sendMeetingReminders();
    
    // Update job progress before completion
    await job.progress(100);
    
    return {
      sent: result.count || 0,
      skipped: result.skipped || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing meeting reminders: ${error.message}`);
    throw error; // Retry or move to failed
  }
};

/**
 * Process single meeting reminder
 * @param {Object} job Bull job with meeting data
 * @returns {Object} Processing results
 */
const processSingleMeetingReminder = async (job) => {
  try {
    const { meetingId } = job.data;
    logger.info(`Processing single meeting reminder job ${job.id} for meeting ${meetingId}`);
    
    // Get meeting details
    const meeting = await meetingService.getMeetingDetails(meetingId);
    
    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }
    
    // Send reminder for specific meeting
    const result = await meetingService.sendReminderForMeeting(meeting);
    
    return {
      meetingId,
      sent: result.count || 0,
      skipped: result.skipped || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing single meeting reminder: ${error.message}`);
    throw error;
  }
};

module.exports = {
  processMeetingReminders,
  processSingleMeetingReminder
};