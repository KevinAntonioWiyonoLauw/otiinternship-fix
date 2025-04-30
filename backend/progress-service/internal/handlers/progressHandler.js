const progressService = require('../services/progressService');
const { asyncHandler, AppError } = require('../Exceptions/errorHandler');
const logger = require('../logger');

// Create a new participation
const createParticipation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { eventType, details } = req.body;
  
  const participation = await progressService.createParticipation(userId, { eventType, details });
  
  res.status(201).json({
    success: true,
    message: 'Participation submitted successfully',
    data: participation
  });
});

// Get current user's participations
const getUserParticipations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const participations = await progressService.getUserParticipations(userId);
  
  res.status(200).json({
    success: true,
    count: participations.length,
    data: participations
  });
});

// Get all participations (admin)
const getAllParticipations = asyncHandler(async (req, res) => {
  const participations = await progressService.getAllParticipations();
  
  res.status(200).json({
    success: true,
    count: participations.length,
    data: participations
  });
});

// Accept a participation
const acceptParticipation = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const token = req.token;
  
  if (isNaN(id)) {
    throw new AppError('Invalid participation ID', 400);
  }
  
  const participation = await progressService.acceptParticipation(id, token);
  
  res.status(200).json({
    success: true,
    message: 'Participation accepted successfully',
    data: participation
  });
});

// Reject a participation
const rejectParticipation = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const token = req.token;
  
  if (isNaN(id)) {
    throw new AppError('Invalid participation ID', 400);
  }
  
  const participation = await progressService.rejectParticipation(id, token);
  
  res.status(200).json({
    success: true,
    message: 'Participation rejected successfully',
    data: participation
  });
});

// Get progress summary for current user
const getProgressSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const token = req.token;
  
  const summary = await progressService.getProgressSummary(userId, token);
  
  res.status(200).json({
    success: true,
    data: summary
  });
});

module.exports = {
  createParticipation,
  getUserParticipations,
  getAllParticipations,
  acceptParticipation,
  rejectParticipation,
  getProgressSummary
};