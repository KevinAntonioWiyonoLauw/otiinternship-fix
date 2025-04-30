const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const logger = require('../logger');

// Simple metrics for QR code operations
const metrics = {
  qrGenerationCount: 0,
  qrVerificationCount: 0,
  qrVerificationFailures: 0,
  averageGenerationTime: 0,
  totalGenerationTime: 0
};

/**
 * Generate a QR code for a training session with expiry time
 * @param {number} trainingId - Training ID to encode in QR
 * @param {number} expiryTimestamp - Expiry timestamp in milliseconds 
 * @returns {Promise<Object>} - QR code data and token
 */
const generateQRCode = async (trainingId, expiryTimestamp) => {
  const startTime = performance.now();
  try {
    // Create a payload with training ID and expiry time
    const payload = {
      training_id: trainingId,
      expires_at: expiryTimestamp
    };
    
    // Log the specific expiry date being set
    const expiryDate = new Date(expiryTimestamp);
    logger.debug(`Setting QR payload with expiry timestamp: ${expiryTimestamp} (${expiryDate.toISOString()})`);
    
    // Sign the payload with a secret key to create a token
    const token = jwt.sign(payload, process.env.QR_SECRET || process.env.JWT_SECRET);
    
    // Generate QR code from the token
    const qrCodeDataURL = await QRCode.toDataURL(token);
    
    // Update metrics
    metrics.qrGenerationCount++;
    const generationTime = performance.now() - startTime;
    metrics.totalGenerationTime += generationTime;
    metrics.averageGenerationTime = metrics.totalGenerationTime / metrics.qrGenerationCount;
    
    return {
      qr_code: qrCodeDataURL,
      token,
      expires_at: expiryDate.toISOString(),
      training_id: trainingId
    };
  } catch (error) {
    logger.error(`Error generating QR code: ${error.message}`);
    throw error;
  }
};

/**
 * Verify and extract data from a QR code token
 * @param {string} qrToken - QR token to verify
 * @returns {Object} - Decoded QR data with training_id
 */
const verifyQRCode = (qrToken) => {
  try {
    // Increment verification count
    metrics.qrVerificationCount++;
    
    // Verify the token
    const decoded = jwt.verify(qrToken, process.env.QR_SECRET || process.env.JWT_SECRET);
    
    // Check if the token is expired
    if (decoded.expires_at < Date.now()) {
      metrics.qrVerificationFailures++;
      throw new Error('QR code has expired');
    }
    
    return {
      training_id: decoded.training_id,
      expires_at: new Date(decoded.expires_at).toISOString()
    };
  } catch (error) {
    metrics.qrVerificationFailures++;
    
    if (error.name === 'TokenExpiredError') {
      logger.warn('QR code JWT token has expired');
      throw new Error('QR code has expired');
    }
    
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`Invalid QR token: ${error.message}`);
      throw new Error('Invalid QR code');
    }
    
    logger.error(`Error verifying QR code: ${error.message}`);
    throw error;
  }
};

/**
 * Decode QR code to extract training ID (simplified function)
 * @param {string} qrCode - QR code data
 * @returns {number} - Training ID
 */
const decodeQRCode = (qrCode) => {
  try {
    const decoded = verifyQRCode(qrCode);
    return decoded.training_id;
  } catch (error) {
    logger.error(`Error decoding QR code: ${error.message}`);
    throw error;
  }
};

/**
 * Generate a secure, random QR code ID
 * @returns {string} - Random secure ID
 */
const generateQRId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Check if a QR token is about to expire
 * @param {string} qrToken - QR token to check
 * @param {number} warningMinutes - Minutes before expiry to warn (default: 3)
 * @returns {boolean} - True if expiring soon
 */
const isQRExpiringSoon = (qrToken, warningMinutes = 3) => {
  try {
    // FIXED: Use verify instead of decode for secure token validation
    const decoded = jwt.verify(qrToken, process.env.QR_SECRET || process.env.JWT_SECRET);
    if (!decoded || !decoded.expires_at) return true;
    
    const expiryTime = decoded.expires_at;
    const warningThreshold = Date.now() + (warningMinutes * 60 * 1000);
    
    return expiryTime < warningThreshold;
  } catch (error) {
    logger.error(`Error checking QR expiry: ${error.message}`);
    return true; // Assume expiring soon on error
  }
};

/**
 * Get remaining validity time for a QR code in minutes
 * @param {string} qrToken - QR token to check
 * @returns {number} - Minutes remaining (0 if expired)
 */
const getQRRemainingMinutes = (qrToken) => {
  try {
    // FIXED: Use verify instead of decode for secure token validation
    const decoded = jwt.verify(qrToken, process.env.QR_SECRET || process.env.JWT_SECRET);
    if (!decoded || !decoded.expires_at) return 0;
    
    const expiryTime = decoded.expires_at;
    const now = Date.now();
    
    if (expiryTime <= now) return 0;
    
    // Calculate remaining minutes
    return Math.floor((expiryTime - now) / (60 * 1000));
  } catch (error) {
    // If token is invalid or expired, just return 0 minutes remaining
    logger.warn(`Token validation failed when getting remaining minutes: ${error.message}`);
    return 0;
  }
};

/**
 * Get QR metrics for monitoring
 * @returns {Object} - QR metrics data
 */
const getQRMetrics = () => {
  return {
    ...metrics,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  generateQRCode,
  verifyQRCode,
  decodeQRCode,
  generateQRId,
  isQRExpiringSoon,
  getQRRemainingMinutes,
  getQRMetrics
};