const Product = require('../models/Product');
const Category = require('../models/Category');
const { cacheProducts, getCachedProducts, deleteCachedData } = require('../utils/cache');

// Get all products with pagination and filtering
exports.getAllProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      minPrice, 
      maxPrice, 
      brand, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const cacheKey = `products:${JSON.stringify(req.query)}`;
    
    // Try to get cached data first
    const cachedProducts = await getCachedProducts(cacheKey);
    if (cachedProducts) {
      return res.status(200).json(cachedProducts);
    }

    // Build query
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const result = {
      products,
      currentPage: Number(page),
      totalPages,
      totalProducts: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    // Cache the result for 5 minutes
    await cacheProducts(cacheKey, result, 300);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    // Try cache first
    const cachedProduct = await getCachedProducts(cacheKey);
    if (cachedProduct) {
      return res.status(200).json(cachedProduct);
    }

    const product = await Product.findById(id)
      .populate('category', 'name description')
      .lean();

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Cache for 10 minutes
    await cacheProducts(cacheKey, product, 600);

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product', details: error.message });
  }
};

// Get featured products
// Get featured products - SIMPLE: Just first 5 products
exports.getFeaturedProducts = async (req, res) => {
  try {
    console.log('Fetching first 5 products as featured...');

    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort({ createdAt: -1 }) // Latest first
      .limit(5)
      .lean();

    console.log(`Found ${products.length} products for featured section`);

    res.status(200).json(products);
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products', details: error.message });
  }
};
// Admin: Create new product
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Verify category exists
    const category = await Category.findById(productData.category);
    if (!category) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const product = new Product(productData);
    await product.save();

    // Clear cache
    await deleteCachedData('products:*');
    await deleteCachedData('featured_products');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

// Admin: Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache
    await deleteCachedData('products:*');
    await deleteCachedData('featured_products');
    await deleteCachedData(`product:${id}`);

    res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

// Admin: Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache
    await deleteCachedData('products:*');
    await deleteCachedData('featured_products');
    await deleteCachedData(`product:${id}`);

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const cacheKey = 'categories';
    
    const cachedCategories = await getCachedProducts(cacheKey);
    if (cachedCategories) {
      return res.status(200).json(cachedCategories);
    }

    const categories = await Category.find({ isActive: true }).lean();
    
    // Cache for 30 minutes
    await cacheProducts(cacheKey, categories, 1800);

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
};

// Admin: Create category
exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();

    // Clear cache
    await deleteCachedData('categories');

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
};
