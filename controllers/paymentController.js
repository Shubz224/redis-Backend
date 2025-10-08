const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Order = require('../models/Order');

// Create Razorpay order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    // Get order from database
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order is already paid
    if (order.paymentDetails.status === 'completed') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(order.totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${order.orderNumber}`,
      notes: {
        orderId: order._id.toString(),
        userId: req.user.id
      }
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    // Update order with Razorpay order ID
    order.paymentDetails.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order', 
      details: error.message 
    });
  }
};

// Verify Razorpay payment
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderId 
    } = req.body;

    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed - Invalid signature' 
      });
    }

    // Find and update order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update payment details
    order.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    order.paymentDetails.razorpaySignature = razorpay_signature;
    order.paymentDetails.status = 'completed';
    
    // Update order status to confirmed
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and completed successfully!',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentDetails.status,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed', 
      details: error.message 
    });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentDetails.method,
      paymentStatus: order.paymentDetails.status,
      razorpayOrderId: order.paymentDetails.razorpayOrderId,
      razorpayPaymentId: order.paymentDetails.razorpayPaymentId,
      totalAmount: order.totalAmount,
      orderStatus: order.status
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get payment status', 
      details: error.message 
    });
  }
};
