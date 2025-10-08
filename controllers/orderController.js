const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Create new order FROM CART
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    
    // Get user with populated cart
    const user = await User.findById(req.user.id)
      .populate('cart.product', 'name price stock isActive');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if cart is empty
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Filter active products and verify stock
    const validCartItems = [];
    let totalAmount = 0;

    for (const cartItem of user.cart) {
      const product = cartItem.product;
      
      if (!product || !product.isActive) {
        return res.status(400).json({ 
          message: `Product ${product?.name || 'Unknown'} is no longer available` 
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}` 
        });
      }

      const itemTotal = product.price * cartItem.quantity;
      totalAmount += itemTotal;

      validCartItems.push({
        product: product._id,
        quantity: cartItem.quantity,
        price: product.price
      });
    }

    // Generate order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const orderNumber = `ORD${timestamp}${random}`;

    // Create order from cart items
    const order = new Order({
      user: req.user.id,
      orderNumber: orderNumber,
      items: validCartItems,
      totalAmount,
      shippingAddress,
      paymentDetails: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'completed' : 'pending'
      }
    });

    await order.save();

    // Update product stock
    for (const cartItem of user.cart) {
      await Product.findByIdAndUpdate(
        cartItem.product._id,
        { $inc: { stock: -cartItem.quantity } }
      );
    }

    // Clear user's cart after successful order
    user.cart = [];
    await user.save();

    // Populate order for response
    await order.populate('items.product', 'name images price');

    res.status(201).json({
      message: 'Order placed successfully from cart',
      order
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create order', 
      details: error.message 
    });
  }
};



// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { user: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      orders,
      currentPage: Number(page),
      totalPages,
      totalOrders: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch orders', 
      details: error.message 
    });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id)
      .populate('items.product', 'name images price description')
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch order', 
      details: error.message 
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .populate('items.product', 'name images')
      .select('orderNumber status createdAt updatedAt trackingInfo shippingAddress');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create tracking response based on status
    let trackingMessage = '';
    let estimatedDelivery = null;

    switch (order.status) {
      case 'pending':
        trackingMessage = 'Order received and being processed';
        break;
      case 'confirmed':
        trackingMessage = 'Order confirmed and preparing for shipment';
        break;
      case 'processing':
        trackingMessage = 'Order is being prepared';
        break;
      case 'shipped':
        trackingMessage = 'Order has been shipped';
        estimatedDelivery = order.trackingInfo?.estimatedDelivery;
        break;
      case 'delivered':
        trackingMessage = 'Order has been delivered';
        break;
      case 'cancelled':
        trackingMessage = 'Order has been cancelled';
        break;
      default:
        trackingMessage = 'Order status unknown';
    }

    res.status(200).json({
      orderNumber: order.orderNumber,
      status: order.status,
      message: trackingMessage,
      estimatedDelivery,
      trackingNumber: order.trackingInfo?.trackingNumber,
      carrier: order.trackingInfo?.carrier,
      orderDate: order.createdAt,
      lastUpdated: order.updatedAt
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to track order', 
      details: error.message 
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU1MTU2OGUxZjViNDIxYjcxMzQ2MWEiLCJpYXQiOjE3NTk4NDc3ODMsImV4cCI6MTc1OTg1MDc4M30.haOdRaU3VRCb_yQInU1uU1STzv1nIs5h3bv3xUyQ5AY

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to cancel order', 
      details: error.message 
    });
  }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name price')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      orders,
      currentPage: Number(page),
      totalPages,
      totalOrders: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch orders', 
      details: error.message 
    });
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier, estimatedDelivery } = req.body;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.status = status;
    
    // Update tracking info if provided
    if (trackingNumber || carrier || estimatedDelivery) {
      order.trackingInfo = {
        ...order.trackingInfo,
        ...(trackingNumber && { trackingNumber }),
        ...(carrier && { carrier }),
        ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) })
      };
    }

    await order.save();

    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update order status', 
      details: error.message 
    });
  }
};
