const express = require('express');
const divisionHandler = require('../handlers/divisionHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all divisions
router.get('/', divisionHandler.getAllDivisions);

// Get division by ID
router.get('/:id', divisionHandler.getDivisionById);

// Get users in division
router.get('/:id/users', authMiddleware, divisionHandler.getUsersByDivision);

// Create division (KADIV only)
router.post('/', authMiddleware, divisionHandler.createDivision);

// Update division (KADIV only)
router.put('/:id', authMiddleware, divisionHandler.updateDivision);

// Delete division (KADIV only)
router.delete('/:id', authMiddleware, divisionHandler.deleteDivision);

// Add user to division (KADIV only)
router.post('/:id/users', authMiddleware, divisionHandler.addUserToDivision);

// Update user role in division (KADIV only)
router.put('/:id/users/:userId', authMiddleware, divisionHandler.updateUserRole);

// Remove user from division (KADIV only)
router.delete('/:id/users/:userId', authMiddleware, divisionHandler.removeUserFromDivision);

module.exports = router;