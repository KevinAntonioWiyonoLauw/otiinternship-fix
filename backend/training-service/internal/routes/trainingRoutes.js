const express = require('express');
const trainingHandler = require('../handlers/trainingHandler');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// CREATE
router.post('/', trainingHandler.createTraining);
router.post('/:id/participants', trainingHandler.addParticipantsToTraining);
router.post('/presence', trainingHandler.recordPresence);
router.post('/:id/add-division-members', trainingHandler.addDivisionMembersToTraining);
router.post('/:id/force-add-participants', trainingHandler.forceAddParticipants);

// READ
router.get('/upcoming', trainingHandler.getUpcomingTrainings);
router.get('/:id', trainingHandler.getTraining);
router.get('/:id/participants', trainingHandler.getTrainingParticipants);
router.get('/check-kadiv/:userId', trainingHandler.checkUserKadivStatus);

// Count endpoints
router.get('/count/all-divisions', trainingHandler.getTrainingsCountByAllDivisions);

// DELETE
router.delete('/:id', trainingHandler.deleteTraining);

// SPECIAL OPERATIONS
router.post('/check-conflict', trainingHandler.checkConflict);
router.post('/reminders', trainingHandler.sendTrainingReminders);
router.post('/reminders/send', trainingHandler.manuallyTriggerReminders);
router.post('/reminders/force/:id', trainingHandler.forceSendReminder);
router.post('/reminders/trigger', authMiddleware, trainingHandler.triggerTrainingReminders);

// Add debug/manual trigger endpoint
router.get('/debug/reminders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is admin/dev (for security)
    const isAdmin = await userApiClient.isUserKadiv(userId);
    
    if (!isAdmin && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this debug endpoint'
      });
    }
    
    // Get trainings that would be sent reminders without actually sending
    const trainings = await trainingRepository.getTrainingsForReminders();
    
    const result = {
      currentTime: new Date().toISOString(),
      trainingsCount: trainings.length,
      trainings: trainings.map(t => ({
        id: t.id,
        title: t.title,
        date: new Date(t.date).toISOString().split('T')[0],
        time: new Date(t.start_time).toTimeString().split(' ')[0],
        totalParticipants: t.participants.length,
        needReminder: t.participantsNeedingReminder.length,
        isToday: new Date(t.date).toDateString() === new Date().toDateString(),
        isTomorrow: new Date(t.date).toDateString() === new Date(new Date().setDate(new Date().getDate() + 1)).toDateString()
      }))
    };
    
    return res.status(200).json({
      success: true,
      debug: result
    });
  } catch (error) {
    logger.error(`Error in debug endpoint: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Debug operation failed',
      error: error.message
    });
  }
});

// Manual trigger endpoint with security
router.post('/reminders/manual-trigger', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check for admin/dev privileges
    const isAdmin = await userApiClient.isUserAdmin(userId);
    
    if (!isAdmin && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can trigger manual reminders'
      });
    }
    
    // Force immediate execution of reminders
    const result = await trainingService.sendTrainingReminders();
    
    return res.status(200).json({
      success: true,
      message: 'Manual reminder trigger executed',
      result
    });
  } catch (error) {
    logger.error(`Error triggering manual reminders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Manual trigger failed',
      error: error.message
    });
  }
});

module.exports = router;