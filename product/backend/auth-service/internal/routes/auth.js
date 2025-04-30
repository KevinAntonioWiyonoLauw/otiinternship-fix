const express = require('express');
const multer = require('multer');
const authHandler = require('../handlers/authHandler');
const importHandler = require('../handlers/importHandler');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
    registerValidation,
    loginValidation,
    changePasswordValidation,
    resetPasswordValidation,
    completeResetValidation
} = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 1 // Maximum 1 file
    },
    fileFilter: (req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Apply rate limiting to auth endpoints
router.use(authLimiter);

// Public routes
router.post('/login', loginValidation, validate, authHandler.login);
router.post('/refresh-token', authHandler.refreshToken);
router.post('/reset-password', resetPasswordValidation, validate, authHandler.resetPassword);
router.post('/complete-reset', completeResetValidation, validate, authHandler.completeResetPassword);

// Protected routes (require authentication)
router.post('/register', authMiddleware, registerValidation, validate, authHandler.register);
router.put('/change-password', authMiddleware, changePasswordValidation, validate, authHandler.changePassword);
router.post('/logout', authMiddleware, authHandler.logout);

// CSV Import route (protected, requires KADIV role)
router.post('/import-csv', authMiddleware, upload.single('file'), importHandler.importUsers);

// Service-to-service authentication 
router.post('/service-login', (req, res, next) => {
    // Bypass rate limit untuk service-to-service authentication
    req.skipRateLimit = true;
    next();
}, authHandler.serviceLogin);

// Get user info route
router.get('/me', authMiddleware, validate, authHandler.me);

module.exports = router;