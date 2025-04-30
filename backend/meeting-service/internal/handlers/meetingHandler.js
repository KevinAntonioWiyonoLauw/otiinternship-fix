const { createMeetingSchema, joinMeetingSchema, checkConflictSchema } = require('../schemas/meetingSchema');
const meetingService = require('../services/meetingService');
const logger = require('../logger');
const axios = require('axios');
const userApiClient = require('../utils/userApiClient');
const meetingRepository = require('../repositories/meetingRepo');
const { formatTimeToWIB, formatTimeRangeToWIB, formatDateToIndonesian } = require('../utils/dateUtils');

/**
 * Membuat meeting baru dengan validasi konflik jadwal
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createMeeting = async (req, res) => {
  try {
    // Validasi request body
    const { error, value } = createMeetingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting data',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { title, date, start_time, end_time, location } = value;
    const userId = req.user.id;

    // Periksa konflik dengan meeting lain
    const meetingConflict = await meetingService.checkScheduleConflict(date, start_time, end_time);

    if (meetingConflict) {
      logger.warn(`Meeting scheduling conflict detected for ${date} at ${start_time}-${end_time}`);
      return res.status(409).json({
        success: false,
        message: 'Schedule conflict: The selected time range is already booked.',
        conflict: {
          type: 'meeting',
          title: meetingConflict.title,
          date: formatDateToIndonesian(meetingConflict.date),
          startTime: formatTimeToWIB(meetingConflict.startTime),
          endTime: formatTimeToWIB(meetingConflict.endTime)
        }
      });
    }

    // Periksa konflik dengan training
    try {
      const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://training-service-api:8004';
      const authToken = req.headers.authorization;

      logger.info(`Checking training conflicts for ${date} at ${start_time}-${end_time}`);

      const conflictResponse = await axios.post(
        `${trainingServiceUrl}/api/trainings/check-conflict`,
        { date, start_time, end_time },
        {
          headers: { Authorization: authToken },
          timeout: 5000
        }
      );

      if (conflictResponse.data && conflictResponse.data.conflict) {
        logger.warn(`Training scheduling conflict detected for ${date} at ${start_time}-${end_time}`);
        return res.status(409).json({
          success: false,
          message: 'Schedule conflict: The selected time range is already booked for training.',
          conflict: {
            type: 'training',
            title: conflictResponse.data.training.title,
            date: conflictResponse.data.training.date,
            startTime: conflictResponse.data.training.startTime,
            endTime: conflictResponse.data.training.endTime
          }
        });
      }
    } catch (error) {
      logger.error(`Error checking training conflicts: ${error.message}`);
      // Lanjutkan tapi dengan warning
      logger.warn('Continuing with meeting creation despite training conflict check failure');
    }

    // Buat meeting
    const meeting = await meetingService.createMeeting({
      title,
      date,
      startTime: start_time,  // Konversi dari snake_case ke camelCase
      endTime: end_time,      // Konversi dari snake_case ke camelCase
      location,
      createdBy: userId
    });

    // Tambahkan creator sebagai peserta meeting secara otomatis
    try {
      logger.info(`Adding creator ${userId} as participant to meeting ${meeting.id}`);
      await meetingRepository.addParticipant(meeting.id, userId);
    } catch (participantError) {
      logger.error(`Failed to add creator as participant: ${participantError.message}`);
      // Tetap lanjutkan meskipun gagal menambahkan creator sebagai peserta
    }

    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });
  } catch (error) {
    logger.error(`Error creating meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bergabung ke meeting menggunakan kode join
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinMeeting = async (req, res) => {
  try {
    // Validasi request body
    const { error, value } = joinMeetingSchema.validate(req.body);

    if (error) {
      logger.warn(`Invalid join meeting data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid join code',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { join_code } = value;
    const userId = req.user.id;

    // Join meeting
    const result = await meetingService.joinMeeting(join_code, userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Invalid join code'
      });
    }

    if (result.alreadyJoined) {
      return res.status(200).json({
        success: true,
        message: 'You have already joined this meeting',
        meeting: meetingService.formatMeetingResponse(result.meeting)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully joined meeting',
      meeting: meetingService.formatMeetingResponse(result.meeting)
    });
  } catch (error) {
    logger.error(`Error joining meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to join meeting'
    });
  }
};

/**
 * Mendapatkan detail meeting berdasarkan ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMeeting = async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);

    if (isNaN(meetingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting ID'
      });
    }

    const meeting = await meetingService.getMeetingDetails(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    return res.status(200).json({
      success: true,
      meeting: meetingService.formatMeetingResponse(meeting)
    });
  } catch (error) {
    logger.error(`Error getting meeting: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to get meeting details'
    });
  }
};

/**
 * Menghapus meeting - hanya oleh creator atau KADIV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteMeeting = async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(meetingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting ID'
      });
    }

    // Periksa apakah meeting ada
    const meeting = await meetingService.getMeetingDetails(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    const isCreator = meeting.createdBy === userId;

    if (!isCreator) {
      try {
        // Periksa apakah user adalah KADIV
        const isKadiv = await userApiClient.isUserKadiv(userId);
        const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');

        if (!isKadiv && !isHdKadiv) {
          logger.warn(`User ${userId} attempted to delete meeting ${meetingId} but is not authorized`);
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to delete this meeting. Only meeting creator or KADIVs can delete meetings.'
          });
        }
      } catch (authError) {
        logger.error(`Error checking user permissions: ${authError.message}`);

        // Fallback - hanya di development mode
        if (process.env.NODE_ENV !== 'development') {
          return res.status(403).json({
            success: false,
            message: 'Permission verification failed'
          });
        }

        logger.warn('Permission check bypassed in development mode');
      }
    }

    // Hapus meeting
    await meetingService.deleteMeeting(meetingId);

    logger.info(`Meeting ${meetingId} deleted by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete meeting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mengirim reminder untuk satu peserta meeting
 * @param {Object} meeting - Meeting object
 * @param {Object} participant - Participant object
 * @param {String} userEmail - Email address peserta
 * @returns {Promise<Object>} Hasil pengiriman reminder
 */
const sendReminderToParticipant = async (meeting, participant, userEmail) => {
  try {
    if (!meeting || !participant || !userEmail) {
      logger.error('Missing required parameters for sending reminder');
      return { success: false, error: 'Missing required parameters' };
    }

    // Format tanggal untuk email
    const meetingDate = new Date(meeting.date);
    const formattedDate = formatDateToIndonesian(meetingDate);

    // Format waktu dengan benar untuk menghindari masalah epoch date 1970
    let formattedTimeRange;
    try {
      formattedTimeRange = formatTimeRangeToWIB(meeting.startTime, meeting.endTime);
      logger.debug(`Formatted time range for meeting ${meeting.id}: ${formattedTimeRange}`);
    } catch (timeError) {
      logger.error(`Error formatting time range: ${timeError.message}`);
      formattedTimeRange = 'Waktu tidak tersedia';
    }

    logger.info(`Sending reminder to ${userEmail} for meeting on ${formattedDate} at ${formattedTimeRange}`);

    // Siapkan data untuk email service
    const reminderData = {
      email: userEmail,
      user_id: participant.userId,
      meeting_id: meeting.id,
      meeting_title: meeting.title,
      meeting_date: formattedDate,
      meeting_time: formattedTimeRange,
      meeting_location: meeting.location || 'Lokasi belum ditentukan',
      join_code: meeting.joinCode
    };

    // Kirim email reminder
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
      // Catat bahwa reminder telah dikirim
      const recordSuccess = await meetingRepository.recordReminderSent(meeting.id, participant.userId);

      if (recordSuccess) {
        logger.info(`✓ Successfully sent and recorded reminder for meeting ${meeting.id} to ${userEmail}`);
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
 * Mengirim reminder untuk semua peserta meeting
 * @param {Object} meeting - Meeting object dengan peserta yang membutuhkan reminder
 * @returns {Promise<Object>} Hasil dengan jumlah sukses dan gagal
 */
const sendMeetingReminders = async (meeting) => {
  try {
    if (!meeting) {
      throw new Error('No meeting provided');
    }

    logger.info(`Processing reminders for meeting ${meeting.id}: ${meeting.title} on ${meeting.date}`);

    // Periksa apakah ada peserta yang perlu diremind
    if (!meeting.participantsNeedingReminder || meeting.participantsNeedingReminder.length === 0) {
      logger.info(`No participants need reminders for meeting ${meeting.id}`);
      return { success: true, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Kirim reminder ke setiap peserta
    for (const participant of meeting.participantsNeedingReminder) {
      try {
        // Dapatkan email peserta - PENTING: Gunakan userApiClient yang diimpor di awal file
        const userEmail = await userApiClient.getUserEmail(participant.userId);

        if (!userEmail) {
          logger.warn(`No email found for user ${participant.userId}, skipping reminder`);
          failed++;
          continue;
        }

        // Kirim reminder
        const result = await sendReminderToParticipant(meeting, participant, userEmail);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Tambahkan delay untuk menghindari overwhelm email service
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`Error processing reminder for participant ${participant.userId}: ${error.message}`);
        failed++;
      }
    }

    logger.info(`Completed processing reminders for meeting ${meeting.id}: ${sent} sent, ${failed} failed`);
    return { success: true, sent, failed };
  } catch (error) {
    logger.error(`Error in sendMeetingReminders: ${error.message}`);
    return { success: false, sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Memeriksa konflik jadwal (untuk dipanggil oleh Training Service)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkConflict = async (req, res) => {
  try {
    // Validasi request
    const { error, value } = checkConflictSchema.validate(req.body);

    if (error) {
      logger.warn(`Invalid conflict check data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid data for conflict check',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { date, start_time, end_time } = value;

    const conflict = await meetingService.checkScheduleConflict(date, start_time, end_time);

    return res.status(200).json({
      success: true,
      conflict: !!conflict,
      meeting: conflict ? {
        title: conflict.title,
        date: conflict.date,
        startTime: formatTimeToWIB(conflict.startTime),
        endTime: formatTimeToWIB(conflict.endTime)
      } : null
    });
  } catch (error) {
    logger.error(`Error checking meeting conflict: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error checking for conflicts'
    });
  }
};

/**
 * Mendapatkan semua upcoming meetings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUpcomingMeetings = async (req, res) => {
  try {
    const meetings = await meetingService.getUpcomingMeetings();

    return res.status(200).json({
      success: true,
      meetings
    });
  } catch (error) {
    logger.error(`Error getting upcoming meetings: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to get upcoming meetings'
    });
  }
};

/**
 * Memproses semua reminder meeting untuk meetings yang akan datang
 * @returns {Promise<Object>} Hasil dengan jumlah sukses dan gagal
 */
const processMeetingReminders = async () => {
  try {
    logger.info('Starting meeting reminder process');

    // Dapatkan meetings yang memerlukan reminder
    const meetings = await meetingRepository.getMeetingsNeedingReminders();

    if (!meetings || meetings.length === 0) {
      logger.info('No meetings found needing reminders');
      return { success: true, sent: 0, failed: 0 };
    }

    logger.info(`Found ${meetings.length} meetings needing reminders`);

    let totalSent = 0;
    let totalFailed = 0;

    // Proses setiap meeting
    for (const meeting of meetings) {
      try {
        const result = await sendMeetingReminders(meeting);
        totalSent += result.sent;
        totalFailed += result.failed;
      } catch (error) {
        logger.error(`Error processing meeting ${meeting.id}: ${error.message}`);
        totalFailed += (meeting.participantsNeedingReminder?.length || 0);
      }
    }

    logger.info(`Completed all meeting reminders: ${totalSent} sent, ${totalFailed} failed`);
    return { success: true, sent: totalSent, failed: totalFailed };
  } catch (error) {
    logger.error(`Error in processMeetingReminders: ${error.message}`);
    return { success: false, sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Handler Express untuk trigger manual reminder meeting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleManualReminderTrigger = async (req, res) => {
  try {
    // Respond immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: 'Meeting reminder process started'
    });

    // Proses reminder di background
    process.nextTick(async () => {
      try {
        const result = await processMeetingReminders();
        logger.info(`Manual reminder process completed: sent ${result.sent}, failed ${result.failed}`);
      } catch (error) {
        logger.error(`Background meeting reminder process failed: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error starting meeting reminder process: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to start meeting reminder process',
      error: error.message
    });
  }
};

/**
 * Handler Express untuk trigger reminder untuk meeting tertentu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSingleMeetingReminder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Dapatkan detail meeting
    const meetingId = parseInt(id, 10);
    if (isNaN(meetingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting ID'
      });
    }

    const meeting = await meetingRepository.getMeetingById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Pastikan meeting memiliki peserta
    if (!meeting.participants || meeting.participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants found for this meeting'
      });
    }

    // Anggap semua peserta memerlukan reminder untuk trigger manual
    meeting.participantsNeedingReminder = meeting.participants;

    // Respond immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: `Sending reminders for meeting ${id} to ${meeting.participants.length} participants`
    });

    // Proses reminder di background
    process.nextTick(async () => {
      try {
        const result = await sendMeetingReminders(meeting);
        logger.info(`Single meeting reminder completed: sent ${result.sent}, failed ${result.failed}`);
      } catch (error) {
        logger.error(`Background single meeting reminder process failed: ${error.message}`);
      }
    });
  } catch (error) {
    logger.error(`Error processing single meeting reminder: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to process meeting reminder',
      error: error.message
    });
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
  getMeeting,
  checkConflict,
  deleteMeeting,
  getUpcomingMeetings,
  processMeetingReminders,
  sendMeetingReminders,
  sendReminderToParticipant,
  handleManualReminderTrigger,
  handleSingleMeetingReminder
};