const axios = require('axios');
const progressRepo = require('../repositories/progressRepo');
const logger = require('../logger');
const { AppError } = require('../Exceptions/errorHandler');

const presenceServiceUrl = process.env.PRESENCE_SERVICE_URL || 'http://presence-service-api:8006';

// Create a new participation
const createParticipation = async (userId, data) => {
  try {
    return await progressRepo.createParticipation({
      userId,
      eventType: data.eventType,
      details: data.details
    });
  } catch (error) {
    logger.error(`Service error - createParticipation: ${error.message}`);
    throw error;
  }
};

// Get participations for a specific user
const getUserParticipations = async (userId) => {
  try {
    return await progressRepo.getUserParticipations(userId);
  } catch (error) {
    logger.error(`Service error - getUserParticipations: ${error.message}`);
    throw error;
  }
};

// Get all participations (admin)
const getAllParticipations = async () => {
  try {
    return await progressRepo.getAllParticipations();
  } catch (error) {
    logger.error(`Service error - getAllParticipations: ${error.message}`);
    throw error;
  }
};

// Accept a participation
const acceptParticipation = async (id, token) => {
  try {
    const participation = await progressRepo.getParticipationById(id);
    
    if (!participation) {
      throw new AppError('Participation not found', 404);
    }
    
    const updated = await progressRepo.updateParticipationStatus(id, 'accepted');
    
    // Recalculate user progress
    await calculateUserProgress(participation.userId, token);
    
    return updated;
  } catch (error) {
    logger.error(`Service error - acceptParticipation: ${error.message}`);
    throw error;
  }
};

// Reject a participation
const rejectParticipation = async (id, token) => {
  try {
    const participation = await progressRepo.getParticipationById(id);
    
    if (!participation) {
      throw new AppError('Participation not found', 404);
    }
    
    const updated = await progressRepo.updateParticipationStatus(id, 'rejected');
    
    // Recalculate user progress
    await calculateUserProgress(participation.userId, token);
    
    return updated;
  } catch (error) {
    logger.error(`Service error - rejectParticipation: ${error.message}`);
    throw error;
  }
};

// Calculate progress for a user
const calculateUserProgress = async (userId, token) => {
  try {
    // Count accepted committee participations
    const committeeCount = await progressRepo.countAcceptedByType(userId, 'COMMITTEE');
    
    // Count accepted task participations
    const taskCount = await progressRepo.countAcceptedByType(userId, 'TASK');
    
    // Get presence count from Presence Service
    let presenceCount = 0;
    let totalSessions = 1; // Default to avoid division by zero
    
    try {
      const response = await axios.get(
        `${presenceServiceUrl}/api/presence/me/count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.success) {
        presenceCount = response.data.count || 0;
        totalSessions = response.data.totalSessions || 1;
      }
    } catch (error) {
      logger.error(`Failed to get presence data: ${error.message}`);
      // Continue with default values
    }
    
    // Calculate progress according to the formula
    const committeeProgress = committeeCount >= 1 ? 25 : 0;
    const taskProgress = taskCount >= 1 ? 25 : 0;
    const presenceProgress = Math.min(50, (presenceCount / totalSessions) * 50);
    const totalProgress = committeeProgress + taskProgress + presenceProgress;
    
    // Update progress in database
    const updatedProgress = await progressRepo.updateProgress(userId, {
      committeeProgress,
      taskProgress,
      presenceProgress,
      totalProgress
    });
    
    return {
      progress: updatedProgress,
      metrics: {
        committeeCount,
        taskCount,
        presenceCount,
        totalSessions
      }
    };
  } catch (error) {
    logger.error(`Service error - calculateUserProgress: ${error.message}`);
    throw error;
  }
};

// Get progress summary for a user
const getProgressSummary = async (userId, token) => {
  try {
    // Calculate latest progress
    const progressData = await calculateUserProgress(userId, token);
    
    // Get user's participations
    const participations = await progressRepo.getUserParticipations(userId);
    
    return {
      progress: progressData.progress,
      metrics: progressData.metrics,
      participations
    };
  } catch (error) {
    logger.error(`Service error - getProgressSummary: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createParticipation,
  getUserParticipations,
  getAllParticipations,
  acceptParticipation,
  rejectParticipation,
  calculateUserProgress,
  getProgressSummary
};