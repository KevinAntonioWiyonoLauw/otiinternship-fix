const express = require('express');
const {
  createAspirasi,
  getAllAspirasi,
  getAspirasiByTarget,
  getMyAspirasi,
  deleteAspirasi
} = require('../handlers/aspirasiHandler');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create a new aspirasi (anonymous or authenticated)
router.post('/', authMiddleware, createAspirasi);

// Get all aspirasi (public/admin access, uses optional auth)
router.get('/', optionalAuthMiddleware, getAllAspirasi);

// Get aspirasi by target
router.get('/target/:target', authMiddleware, getAspirasiByTarget);

// Get aspirasi submitted by the authenticated user
router.get('/my', authMiddleware, getMyAspirasi);

// Delete aspirasi (Kadiv HD only)
router.delete('/:id', authMiddleware, deleteAspirasi);

module.exports = router;