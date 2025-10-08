const User = require('../models/User');
const Product = require('../models/Product');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshToken')
      .populate('cart.product', 'name price images')
      .populate('wishlist', 'name price images');

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.status(200).json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

// Add address
exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // If this is set as default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(200).json({
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address', details: error.message });
  }
};

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('cart.product', 'name price images stock brand isActive')
      .select('cart');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out inactive products from cart
    const activeCartItems = user.cart.filter(item => 
      item.product && item.product.isActive
    );

    // Calculate cart totals
    let totalItems = 0;
    let totalAmount = 0;

    activeCartItems.forEach(item => {
      totalItems += item.quantity;
      totalAmount += (item.product.price * item.quantity);
    });

    res.status(200).json({
      cart: activeCartItems,
      summary: {
        totalItems,
        totalAmount,
        itemCount: activeCartItems.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch cart', 
      details: error.message 
    });
  }
};


// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user.id);

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If setting as default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, req.body);
    await user.save();

    res.status(200).json({
      message: 'Address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address', details: error.message });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user.id);

    user.addresses.pull(addressId);
    await user.save();

    res.status(200).json({
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address', details: error.message });
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const user = await User.findById(req.user.id);
    
    // Check if product already in cart
    const existingItem = user.cart.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      
      // Check total quantity against stock
      if (existingItem.quantity > product.stock) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
    } else {
      user.cart.push({ product: productId, quantity });
    }

    await user.save();
    
    // Populate cart for response
    await user.populate('cart.product', 'name price images stock');

    res.status(200).json({
      message: 'Product added to cart',
      cart: user.cart
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to cart', details: error.message });
  }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const user = await User.findById(req.user.id);
    const cartItem = user.cart.find(item => 
      item.product.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({ message: 'Product not in cart' });
    }

    cartItem.quantity = quantity;
    await user.save();
    
    await user.populate('cart.product', 'name price images stock');

    res.status(200).json({
      message: 'Cart updated successfully',
      cart: user.cart
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart', details: error.message });
  }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.user.id);
    user.cart = user.cart.filter(item => 
      item.product.toString() !== productId
    );
    
    await user.save();
    await user.populate('cart.product', 'name price images stock');

    res.status(200).json({
      message: 'Product removed from cart',
      cart: user.cart
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from cart', details: error.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = [];
    await user.save();

    res.status(200).json({
      message: 'Cart cleared successfully',
      cart: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart', details: error.message });
  }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(req.user.id);
    
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    await user.populate('wishlist', 'name price images');

    res.status(200).json({
      message: 'Product added to wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist', details: error.message });
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.user.id);
    user.wishlist.pull(productId);
    await user.save();

    await user.populate('wishlist', 'name price images');

    res.status(200).json({
      message: 'Product removed from wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist', details: error.message });
  }
};
