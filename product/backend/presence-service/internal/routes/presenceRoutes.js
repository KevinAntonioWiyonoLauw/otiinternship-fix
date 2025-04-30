const express = require('express');
const {
  recordPresence,
  recordQrPresence,
  recordManualPresence,
  generateQrCode,
  getPresenceList,
  getAttendanceHistory,
  getAttendanceStats,
  getMyAttendanceCount
} = require('../handlers/presenceHandler');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Direct presence recording with presence_type validation
router.post('/', recordPresence);

// Record presence via QR code
router.post('/scan', recordQrPresence);

// Record presence manually (by Kadiv)
router.post('/manual', recordManualPresence);

const enforceHttps = (req, res, next) => {
  if (!req.secure && process.env.NODE_ENV !== 'development') {
    logger.warn(`Insecure request received for path: ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'HTTPS is required for security reasons'
    });
  }
  next();
};

// Generate QR code for a training (by Kadiv)
router.post('/generate-qr', generateQrCode, enforceHttps);

// Get presence list for a training
router.get('/training/:trainingId', getPresenceList);

// Get statistics for a training (new route)
router.get('/stats/:trainingId', getAttendanceStats);

// Get user's attendance history
router.get('/history', getAttendanceHistory);

// Get specific user's attendance history (for Kadiv or admins)
router.get('/history/:userId', getAttendanceHistory);

router.get('/me/count', getMyAttendanceCount);

module.exports = router;