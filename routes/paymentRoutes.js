const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentStatus
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Payment routes - require authentication
router.use(authenticateToken);
router.post('/create-order', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);
router.get('/status/:orderId', getPaymentStatus);

module.exports = router;
