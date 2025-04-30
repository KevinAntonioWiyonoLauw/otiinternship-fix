const express = require('express');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { authenticate, requireKadivHD } = require('../middleware/authMiddleware');
const progressHandler = require('../handlers/progressHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create participation
router.post(
  '/',
  validate(schemas.createParticipation),
  progressHandler.createParticipation
);

// Get user's own participations 
router.get(
  '/me',
  progressHandler.getUserParticipations
);

// Get all participations (admin)
router.get(
  '/',
  requireKadivHD,
  progressHandler.getAllParticipations
);

// Accept participation (admin)
router.patch(
  '/:id/accept',
  requireKadivHD,
  progressHandler.acceptParticipation
);

// Reject participation (admin)
router.patch(
  '/:id/reject',
  requireKadivHD,
  progressHandler.rejectParticipation
);

// Get progress summary for current user
router.get(
  '/me/summary',
  progressHandler.getProgressSummary
);

module.exports = router;