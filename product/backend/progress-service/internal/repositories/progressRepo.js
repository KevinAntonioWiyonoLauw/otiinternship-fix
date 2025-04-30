const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

// Create new participation entry
const createParticipation = async (data) => {
  try {
    return await prisma.participation.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        details: data.details || '',
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error(`Error creating participation: ${error.message}`);
    throw error;
  }
};

// Get user's participations
const getUserParticipations = async (userId) => {
  try {
    return await prisma.participation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    logger.error(`Error getting user participations: ${error.message}`);
    throw error;
  }
};

// Get all participations
const getAllParticipations = async () => {
  try {
    return await prisma.participation.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    logger.error(`Error getting all participations: ${error.message}`);
    throw error;
  }
};

// Get participation by ID
const getParticipationById = async (id) => {
  try {
    return await prisma.participation.findUnique({
      where: { id }
    });
  } catch (error) {
    logger.error(`Error getting participation by ID: ${error.message}`);
    throw error;
  }
};

// Update participation status
const updateParticipationStatus = async (id, status) => {
  try {
    return await prisma.participation.update({
      where: { id },
      data: { status }
    });
  } catch (error) {
    logger.error(`Error updating participation status: ${error.message}`);
    throw error;
  }
};

// Count accepted participations by type
const countAcceptedByType = async (userId, eventType) => {
  try {
    return await prisma.participation.count({
      where: {
        userId,
        eventType,
        status: 'accepted'
      }
    });
  } catch (error) {
    logger.error(`Error counting accepted participations: ${error.message}`);
    throw error;
  }
};

// Get or create progress record for a user
const getOrCreateProgress = async (userId) => {
  try {
    // Try to find existing progress
    let progress = await prisma.progress.findUnique({
      where: { userId }
    });
    
    // Create if it doesn't exist
    if (!progress) {
      progress = await prisma.progress.create({
        data: { userId }
      });
    }
    
    return progress;
  } catch (error) {
    logger.error(`Error getting or creating progress: ${error.message}`);
    throw error;
  }
};

// Update progress values for a user
const updateProgress = async (userId, data) => {
  try {
    return await prisma.progress.upsert({
      where: { userId },
      update: {
        committeeProgress: data.committeeProgress,
        taskProgress: data.taskProgress,
        presenceProgress: data.presenceProgress,
        totalProgress: data.totalProgress,
        updatedAt: new Date()
      },
      create: {
        userId,
        committeeProgress: data.committeeProgress,
        taskProgress: data.taskProgress,
        presenceProgress: data.presenceProgress,
        totalProgress: data.totalProgress
      }
    });
  } catch (error) {
    logger.error(`Error updating progress: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createParticipation,
  getUserParticipations,
  getAllParticipations,
  getParticipationById,
  updateParticipationStatus,
  countAcceptedByType,
  getOrCreateProgress,
  updateProgress
};