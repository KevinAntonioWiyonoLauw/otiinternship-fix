const { body, validationResult } = require('express-validator');

const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Email is not valid')
        .normalizeEmail(),
    body('niu')
        .notEmpty()
        .withMessage('NIU is required')
        .isLength({ max: 50 })
        .withMessage('NIU must be less than 50 characters'),
    body('nama_lengkap')
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ max: 255 })
        .withMessage('Full name must be less than 255 characters'),
    body('password')
        .optional() 
        .isLength({ min: 6 })
        .withMessage('If provided, password must be at least 6 characters long')
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email is not valid')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
];

const completeResetValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const resetPasswordValidation = [
    body('email')
        .isEmail()
        .withMessage('Email is not valid')
        .normalizeEmail()
];

module.exports = {
    registerValidation,
    loginValidation,
    changePasswordValidation,
    completeResetValidation,
    resetPasswordValidation,
    validate
};