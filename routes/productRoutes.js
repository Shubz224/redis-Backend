const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory
} = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Public routes with caching
router.get('/products', cacheMiddleware('products', 300), getAllProducts);
router.get('/products/featured', cacheMiddleware('featured', 600), getFeaturedProducts);
router.get('/products/:id', cacheMiddleware('product', 600), getProductById);
router.get('/categories', cacheMiddleware('categories', 1800), getCategories);

// Admin routes - require authentication and admin role
router.use('/admin', authenticateToken, isAdmin);
router.post('/admin/products', createProduct);
router.put('/admin/products/:id', updateProduct);
router.delete('/admin/products/:id', deleteProduct);
router.post('/admin/categories', createCategory);

module.exports = router;
