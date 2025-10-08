const express = require('express');
const router = express.Router();
const {
  createOrder,
  //createDirectOrder,    // Add this if you want direct buy option
  getUserOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Apply authentication middleware to all order routes
router.use(authenticateToken);

// User order routes
router.post('/orders', createOrder);                    // Create order from cart
//router.post('/orders/direct', createDirectOrder);       // Optional: Direct buy
router.get('/orders', getUserOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/cancel', cancelOrder);

// Public order tracking (no auth required for tracking by order number)
router.get('/track/:orderNumber', trackOrder);

// Admin order routes
router.get('/admin/orders', isAdmin, getAllOrders);
router.put('/admin/orders/:id/status', isAdmin, updateOrderStatus);

module.exports = router;
