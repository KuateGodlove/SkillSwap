// controllers/paymentController.js
const Payment = require('../Models/Payment');
const Order = require('../Models/Order');
const User = require('../Models/User');

// @desc    Create payment intent (for Stripe)
// @route   POST /api/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Verify order exists and user is authorized
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to pay for this order (client)
    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this order'
      });
    }

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      orderId,
      amount,
      status: 'pending',
      type: 'order-payment'
    });

    await payment.save();

    // Here you would typically create a Stripe payment intent
    // For now, just return the payment record
    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      payment,
      // In real implementation, would include Stripe client secret
      clientSecret: 'pi_test_secret' // mock for now
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId, paymentMethodId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify user authorization
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this payment'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    // Update order payment status
    if (payment.orderId) {
      await Order.findByIdAndUpdate(
        payment.orderId,
        { paymentStatus: 'completed' }
      );
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    const payments = await Payment.find(query)
      .populate('orderId', 'title amount status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

// @desc    Get invoice
// @route   GET /api/payments/invoices/:invoiceId
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const payment = await Payment.findById(invoiceId)
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'title amount description');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify user authorization
    if (payment.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this invoice'
      });
    }

    res.json({
      success: true,
      invoice: {
        invoiceNumber: payment.invoiceNumber,
        date: payment.createdAt,
        user: payment.userId,
        order: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

// @desc    Request withdrawal
// @route   POST /api/payments/withdraw
// @access  Private (Provider only)
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankAccount } = req.body;

    if (!amount || !bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Amount and bank account details are required'
      });
    }

    // Verify user is a provider
    const user = await User.findById(req.user._id);
    if (user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can request withdrawals'
      });
    }

    // Create withdrawal payment record
    const withdrawal = new Payment({
      userId: req.user._id,
      amount,
      status: 'pending',
      type: 'withdrawal',
      paymentMethod: 'bank-transfer',
      metadata: { bankAccount }
    });

    await withdrawal.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      withdrawal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request withdrawal',
      error: error.message
    });
  }
};
