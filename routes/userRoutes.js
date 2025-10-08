const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all user routes
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Address routes
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Cart routes
router.post('/cart', addToCart);
router.get('/cart',getCart);
router.put('/cart', updateCartItem);
router.delete('/cart/:productId', removeFromCart);
router.delete('/cart', clearCart);

// Wishlist routes
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

module.exports = router;
