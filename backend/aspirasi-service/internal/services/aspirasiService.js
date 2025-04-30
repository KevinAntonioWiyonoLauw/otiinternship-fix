const aspirasiRepository = require('../repositories/aspirasiRepo');
const authApiClient = require('../utils/authApiClient');
const logger = require('../logger');

// Create a new aspirasi
const createAspirasi = async (aspirasiData, userId) => {
  try {
    // If anonymous, set sender_id to null
    const sender_id = aspirasiData.anonymous ? null : userId;

    // Create aspirasi entry
    const aspirasi = await aspirasiRepository.createAspirasi({
      sender_id,
      target: aspirasiData.target,
      subject: aspirasiData.subject,
      message: aspirasiData.message
    });

    logger.info(`Aspirasi created: ${aspirasi.id} by ${sender_id || 'anonymous'}`);
    return aspirasi;
  } catch (error) {
    logger.error(`Error in createAspirasi service: ${error.message}`);
    throw error;
  }
};

// Get all aspirasi (admin access)
const getAllAspirasi = async (limit, offset) => {
  try {
    const aspirasi = await aspirasiRepository.getAllAspirasi(limit, offset);
    return aspirasi;
  } catch (error) {
    logger.error(`Error in getAllAspirasi service: ${error.message}`);
    throw error;
  }
};

// Get aspirasi by target
const getAspirasiByTarget = async (target) => {
  try {
    const aspirasi = await aspirasiRepository.getAspirasisByTarget(target);
    return aspirasi;
  } catch (error) {
    logger.error(`Error in getAspirasiByTarget service: ${error.message}`);
    throw error;
  }
};

// Get aspirasi by sender ID
const getMyAspirasi = async (userId) => {
  try {
    const aspirasi = await aspirasiRepository.getAspirasisBySenderId(userId);
    return aspirasi;
  } catch (error) {
    logger.error(`Error in getMyAspirasi service: ${error.message}`);
    throw error;
  }
};

// Delete aspirasi (Kadiv HD only)
const deleteAspirasi = async (aspirasiId, userId, authToken) => {
  try {
    // Check if user is Kadiv HD
    const isKadivHD = await authApiClient.isUserKadivHD(userId, authToken);

    if (!isKadivHD) {
      logger.warn(`User ${userId} attempted to delete aspirasi but is not Kadiv HD`);
      throw new Error('Only Kadiv HD can delete aspirasi');
    }

    // Check if aspirasi exists
    const aspirasi = await aspirasiRepository.getAspirasiById(aspirasiId);

    if (!aspirasi) {
      logger.warn(`Failed to delete aspirasi ${aspirasiId}: not found`);
      throw new Error('Aspirasi not found');
    }

    // Delete aspirasi
    const deletedAspirasi = await aspirasiRepository.deleteAspirasi(aspirasiId);

    logger.info(`Aspirasi ${aspirasiId} deleted by Kadiv HD ${userId}`);
    return deletedAspirasi;
  } catch (error) {
    logger.error(`Error in deleteAspirasi service: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createAspirasi,
  getAllAspirasi,
  getAspirasiByTarget,
  getMyAspirasi,
  deleteAspirasi
};