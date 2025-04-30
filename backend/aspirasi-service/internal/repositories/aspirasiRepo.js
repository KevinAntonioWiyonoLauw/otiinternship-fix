const prisma = require('../../db');
const logger = require('../logger');

// Create a new aspirasi entry
const createAspirasi = async (aspirasiData) => {
  const { sender_id, target, subject, message } = aspirasiData;
  
  try {
    return await prisma.aspirasi.create({
      data: {
        senderId: sender_id,
        target,
        subject,
        message
      }
    });
  } catch (error) {
    logger.error(`Error creating aspirasi: ${error.message}`);
    throw error;
  }
};

// Get aspirasi by ID
const getAspirasiById = async (id) => {
  try {
    return await prisma.aspirasi.findUnique({
      where: { id: parseInt(id) }
    });
  } catch (error) {
    logger.error(`Error getting aspirasi by ID: ${error.message}`);
    throw error;
  }
};

// Get all aspirasi
const getAllAspirasi = async (limit = 100, offset = 0) => {
  try {
    return await prisma.aspirasi.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
  } catch (error) {
    logger.error(`Error getting all aspirasi: ${error.message}`);
    throw error;
  }
};

// Get aspirasi by sender ID
const getAspirasisBySenderId = async (senderId) => {
  try {
    return await prisma.aspirasi.findMany({
      where: {
        senderId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting aspirasi by sender ID: ${error.message}`);
    throw error;
  }
};

// Get aspirasi by target
const getAspirasiByTarget = async (target) => {
  try {
    return await prisma.aspirasi.findMany({
      where: {
        target
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting aspirasi by target: ${error.message}`);
    throw error;
  }
};

// Delete aspirasi by ID
const deleteAspirasi = async (id) => {
  try {
    return await prisma.aspirasi.delete({
      where: { id: parseInt(id) }
    });
  } catch (error) {
    logger.error(`Error deleting aspirasi: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createAspirasi,
  getAspirasiById,
  getAllAspirasi,
  getAspirasisByTarget: getAspirasiByTarget,
  getAspirasisBySenderId,
  deleteAspirasi
};