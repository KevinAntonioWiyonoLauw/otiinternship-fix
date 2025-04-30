const express = require('express');
const logger = require('../logger');
const {
  createMeeting,
  joinMeeting,
  getMeeting,
  checkConflict,
  deleteMeeting,
  getUpcomingMeetings,
} = require('../handlers/meetingHandler');
const authMiddleware = require('../middleware/auth');
const { meetingReminderQueue } = require('../queues/index');
const userApiClient = require('../utils/userApiClient');
const meetingService = require('../services/meetingService');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Create a new meeting
router.post('/', createMeeting);

// Join a meeting
router.post('/join', joinMeeting);

// Get all upcoming meetings
router.get('/upcoming', getUpcomingMeetings);

// Get meeting details
router.get('/:id', getMeeting);

// Send meeting reminders manually
router.post('/reminders/send', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Periksa apakah user adalah KADIV di divisi HD (divisi ID 16)
    try {
      // Cek apakah KADIV di divisi manapun
      const isKadiv = await userApiClient.isUserKadiv(userId);

      // Khusus cek apakah KADIV HD
      const isHdKadiv = await userApiClient.isUserInDivisionWithRole(userId, 16, 'KADIV');

      if (!isKadiv && !isHdKadiv) {
        logger.warn(`User ${userId} attempted to trigger meeting reminders but is not authorized`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only KADIVs can trigger reminders manually, especially KADIV HD'
        });
      }
    } catch (authError) {
      logger.error(`Error checking user permissions: ${authError.message}`);
      // Fallback - izinkan akses dalam development mode
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
          success: false,
          message: 'Permission verification failed'
        });
      }

      logger.warn('Permission check bypassed in development mode');
    }

    // Tambahkan job ke queue dengan prioritas tinggi
    const job = await meetingReminderQueue.add('check-reminders', {
      isManualTrigger: true,
      triggeredBy: userId
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      priority: 10 // Prioritas tinggi untuk trigger manual
    });

    logger.info(`Added manual reminder job ${job.id} to queue by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Meeting reminders job has been queued',
      jobId: job.id
    });
  } catch (error) {
    logger.error(`Error triggering meeting reminders manually: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to process meeting reminders'
    });
  }
});

router.post('/reminders/force/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting ID'
      });
    }

    // Check if user is the creator or a KADIV
    const meeting = await meetingService.getMeetingDetails(parseInt(id));

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.createdBy !== userId) {
      const isKadiv = await userApiClient.isUserKadiv(userId);

      if (!isKadiv) {
        return res.status(403).json({
          success: false,
          message: 'Only meeting creator or KADIVs can force-send reminders'
        });
      }
    }

    // Add job to the queue
    const job = await meetingReminderQueue.add('single-meeting', {
      meetingId: parseInt(id)
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      priority: 1 // Higher priority
    });

    logger.info(`Added force reminder job ${job.id} for meeting ${id} to queue`);

    return res.status(200).json({
      success: true,
      message: `Reminder job for meeting ${id} has been queued`,
      jobId: job.id
    });
  } catch (error) {
    logger.error(`Error queueing meeting reminder: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to queue meeting reminder'
    });
  }
});

// Delete a meeting
router.delete('/:id', deleteMeeting);

// Add endpoint to check for conflicts
router.post('/check-conflict', checkConflict);

module.exports = router;