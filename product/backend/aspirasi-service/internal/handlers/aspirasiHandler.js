const {
  createAspirasiSchema,
  deleteAspirasiSchema,
  getAspirasiByTargetSchema
} = require('../schemas/aspirasiSchema');
const aspirasiService = require('../services/aspirasiService');
const logger = require('../logger');

// Create a new aspirasi
const createAspirasi = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createAspirasiSchema.validate(req.body);

    if (error) {
      logger.warn(`Invalid aspirasi creation data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid aspirasi data',
        errors: error.details.map(detail => detail.message)
      });
    }
    // Get user ID from JWT token (if authenticated)
    const userId = req.user ? req.user.id : null;

    // Create aspirasi
    const aspirasi = await aspirasiService.createAspirasi(value, userId);

    return res.status(201).json({
      success: true,
      message: 'Aspirasi submitted successfully',
      aspirasi
    });
  } catch (error) {
    logger.error(`Error creating aspirasi: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to submit aspirasi'
    });
  }
};

// Get all aspirasi (admin access)
const getAllAspirasi = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Get all aspirasi
    const aspirasi = await aspirasiService.getAllAspirasi(limit, offset);

    return res.status(200).json({
      success: true,
      count: aspirasi.length,
      aspirasi
    });
  } catch (error) {
    logger.error(`Error getting all aspirasi: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to get aspirasi'
    });
  }
};

// Get aspirasi by target
const getAspirasiByTarget = async (req, res) => {
  try {
    // Validate request params
    const { error, value } = getAspirasiByTargetSchema.validate({ target: req.params.target });

    if (error) {
      logger.warn(`Invalid target parameter: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid target parameter',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Get aspirasi by target
    const aspirasi = await aspirasiService.getAspirasiByTarget(value.target);

    return res.status(200).json({
      success: true,
      count: aspirasi.length,
      aspirasi
    });
  } catch (error) {
    logger.error(`Error getting aspirasi by target: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to get aspirasi'
    });
  }
};

// Get my aspirasi
const getMyAspirasi = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.id;

    // Get aspirasi submitted by the user
    const aspirasi = await aspirasiService.getMyAspirasi(userId);

    return res.status(200).json({
      success: true,
      count: aspirasi.length,
      aspirasi
    });
  } catch (error) {
    logger.error(`Error getting my aspirasi: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to get your aspirasi'
    });
  }
};

// Delete aspirasi (Kadiv HD only)
const deleteAspirasi = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = deleteAspirasiSchema.validate({ aspirasi_id: parseInt(req.params.id) });

    if (error) {
      logger.warn(`Invalid aspirasi deletion data: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid aspirasi ID',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Get user ID from JWT token
    const userId = req.user.id;

    // Delete aspirasi
    const deletedAspirasi = await aspirasiService.deleteAspirasi(
      value.aspirasi_id,
      userId,
      req.token
    );

    return res.status(200).json({
      success: true,
      message: 'Aspirasi deleted successfully',
      aspirasi_id: deletedAspirasi.id
    });
  } catch (error) {
    logger.error(`Error deleting aspirasi: ${error.message}`);

    if (error.message === 'Only Kadiv HD can delete aspirasi') {
      return res.status(403).json({
        success: false,
        message: 'Only Kadiv HD can delete aspirasi'
      });
    }

    if (error.message === 'Aspirasi not found') {
      return res.status(404).json({
        success: false,
        message: 'Aspirasi not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete aspirasi'
    });
  }
};

module.exports = {
  createAspirasi,
  getAllAspirasi,
  getAspirasiByTarget,
  getMyAspirasi,
  deleteAspirasi
};