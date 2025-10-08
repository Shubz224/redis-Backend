const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authenticateToken, logout);

module.exports = router;
