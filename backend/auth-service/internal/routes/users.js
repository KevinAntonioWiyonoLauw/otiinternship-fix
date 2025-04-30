const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const userHandler = require('../handlers/userHandler');

const router = express.Router();

// Fallback handler untuk menghindari undefined handler
const fallbackHandler = (handlerFunction, defaultResponse) => {
    return (req, res) => {
        if (handlerFunction) {
            return handlerFunction(req, res);
        }
        return res.status(defaultResponse.status || 200).json(defaultResponse.body);
    };
};

// Get user by ID
router.get('/:id', authMiddleware, fallbackHandler(userHandler.getUserById, {
    status: 404,
    body: { success: false, message: 'User not found' }
}));

// Update user
router.put('/:id', authMiddleware, fallbackHandler(userHandler.updateUser, {
    body: { success: true, message: 'User updated (placeholder)' }
}));

// Delete user (KADIV only)
router.delete('/:id', authMiddleware, fallbackHandler(userHandler.deleteUser, {
    body: { success: true, message: 'User deleted (placeholder)' }
}));

// Get user divisions
router.get('/:id/divisions', authMiddleware, fallbackHandler(userHandler.getUserDivisions, {
    body: { success: true, divisions: [] }
}));

// Get all users (KADIV only)
router.get('/', authMiddleware, fallbackHandler(userHandler.getAllUsers, {
    body: { success: false, message: 'Failed to get users' }
}));

module.exports = router;