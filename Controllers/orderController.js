// controllers/orderController.js
const Order = require('../Models/Order');
const RFQ = require('../Models/RFQ');
const Quote = require('../Models/Quote');
const User = require('../Models/User');
const Payment = require('../Models/Payment');
const Message = require('../Models/Message');
const Notification = require('../Models/Notification');

// ==================== CLIENT ORDER ROUTES ====================

// @desc    Get client's orders
// @route   GET /api/orders/client
// @access  Private (Client only)
exports.getClientOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { clientId: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('providerId', 'firstName lastName providerDetails.businessName providerDetails.rating')
      .populate('rfqId', 'title category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get counts by status
    const activeCount = await Order.countDocuments({ 
      clientId: req.user._id, 
      status: { $in: ['pending', 'in-progress', 'review'] } 
    });
    
    const completedCount = await Order.countDocuments({ 
      clientId: req.user._id, 
      status: 'completed' 
    });

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      counts: {
        active: activeCount,
        completed: completedCount
      }
    });
  } catch (error) {
    console.error('Get client orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
};

// @desc    Get provider's orders
// @route   GET /api/orders/provider
// @access  Private (Provider only)
exports.getProviderOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { providerId: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('clientId', 'firstName lastName clientDetails.companyName')
      .populate('rfqId', 'title category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Calculate earnings
    const earnings = await Order.aggregate([
      { $match: { providerId: req.user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      earnings: earnings[0]?.total || 0
    });
  } catch (error) {
    console.error('Get provider orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
};

// @desc    Get order details
// @route   GET /api/orders/:orderId
// @access  Private
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('clientId', 'firstName lastName email phone clientDetails avatar')
      .populate('providerId', 'firstName lastName email phone providerDetails avatar')
      .populate('rfqId')
      .populate('quoteId');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check authorization
    const isClient = order.clientId._id.toString() === req.user._id.toString();
    const isProvider = order.providerId._id.toString() === req.user._id.toString();

    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized to view this order' 
      });
    }

    // Get recent messages count
    const unreadMessages = await Message.countDocuments({
      orderId: order._id,
      receiverId: req.user._id,
      read: false
    });

    // Get payment info
    const payments = await Payment.find({ orderId: order._id });

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        unreadMessages,
        payments
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch order details', 
      error: error.message 
    });
  }
};

// ==================== ORDER MANAGEMENT ====================

// @desc    Create order from accepted quote
// @route   POST /api/orders/create-from-quote/:quoteId
// @access  Private (Client only)
exports.createOrderFromQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { startDate, milestones } = req.body;

    // Get quote details
    const quote = await Quote.findById(quoteId)
      .populate('rfqId')
      .populate('providerId');

    if (!quote) {
      return res.status(404).json({ 
        success: false,
        message: 'Quote not found' 
      });
    }

    // Verify ownership
    if (quote.rfqId.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({ quoteId });
    if (existingOrder) {
      return res.status(400).json({ 
        success: false,
        message: 'Order already exists for this quote' 
      });
    }

    // Create milestones if not provided
    const orderMilestones = milestones || [
      {
        title: 'Project Initiation',
        description: 'Project kickoff and requirements finalization',
        amount: quote.amount * 0.2,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        title: 'Development Phase',
        description: 'Main development work',
        amount: quote.amount * 0.5,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        title: 'Testing & Delivery',
        description: 'Quality assurance and final delivery',
        amount: quote.amount * 0.3,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending'
      }
    ];

    // Create order
    const order = new Order({
      rfqId: quote.rfqId._id,
      quoteId: quote._id,
      clientId: req.user._id,
      providerId: quote.providerId._id,
      title: quote.rfqId.title,
      description: quote.rfqId.description,
      amount: quote.amount,
      milestones: orderMilestones,
      status: 'pending',
      startDate: startDate || new Date(),
      deadline: orderMilestones[orderMilestones.length - 1].dueDate,
      paymentSchedule: orderMilestones.map(m => ({
        milestoneId: m._id,
        amount: m.amount,
        status: 'pending'
      }))
    });

    await order.save();

    // Update quote status
    quote.status = 'accepted';
    quote.orderId = order._id;
    await quote.save();

    // Update RFQ status
    await RFQ.findByIdAndUpdate(quote.rfqId._id, { 
      status: 'completed',
      selectedQuoteId: quote._id,
      selectedProviderId: quote.providerId._id
    });

    // Create notification for provider
    await Notification.create({
      userId: quote.providerId._id,
      type: 'order_started',
      title: 'New Project Started',
      message: `${req.user.firstName} has started a new project: ${quote.rfqId.title}`,
      data: { orderId: order._id },
      link: `/provider/orders/${order._id}`,
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order', 
      error: error.message 
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:orderId/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check authorization
    const isClient = order.clientId.toString() === req.user._id.toString();
    const isProvider = order.providerId.toString() === req.user._id.toString();

    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['in-progress', 'cancelled'],
      'in-progress': ['review', 'cancelled'],
      'review': ['completed', 'in-progress'],
      'completed': [],
      'cancelled': [],
      'disputed': ['in-progress', 'cancelled', 'completed']
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot transition from ${order.status} to ${status}` 
      });
    }

    order.status = status;
    if (status === 'completed') {
      order.completedDate = new Date();
    }

    await order.save();

    // Create notification for the other party
    const notifyUserId = isClient ? order.providerId : order.clientId;
    await Notification.create({
      userId: notifyUserId,
      type: 'order_status_change',
      title: 'Order Status Updated',
      message: `Order ${order.title} status changed to ${status}`,
      data: { orderId: order._id, status },
      link: isClient ? `/provider/orders/${order._id}` : `/client/orders/${order._id}`,
      priority: 'medium'
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order status', 
      error: error.message 
    });
  }
};

// ==================== MILESTONE MANAGEMENT ====================

// @desc    Get order milestones
// @route   GET /api/orders/:orderId/milestones
// @access  Private
exports.getMilestones = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).select('milestones progress');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check authorization
    const isClient = order.clientId.toString() === req.user._id.toString();
    const isProvider = order.providerId.toString() === req.user._id.toString();

    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    res.json({
      success: true,
      milestones: order.milestones,
      progress: order.progress
    });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch milestones', 
      error: error.message 
    });
  }
};

// @desc    Add milestone to order
// @route   POST /api/orders/:orderId/milestones
// @access  Private (Provider only)
exports.addMilestone = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { title, description, amount, dueDate } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only provider can add milestones
    if (order.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the provider can add milestones' 
      });
    }

    // Check if order is in progress
    if (order.status !== 'in-progress') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only add milestones to in-progress orders' 
      });
    }

    // Validate total amount doesn't exceed order amount
    const currentTotal = order.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (currentTotal + amount > order.amount) {
      return res.status(400).json({ 
        success: false,
        message: 'Total milestone amount would exceed order amount' 
      });
    }

    const milestone = {
      title,
      description,
      amount,
      dueDate: new Date(dueDate),
      status: 'pending'
    };

    order.milestones.push(milestone);
    
    // Update payment schedule
    order.paymentSchedule.push({
      milestoneId: order.milestones[order.milestones.length - 1]._id,
      amount,
      status: 'pending'
    });

    await order.save();

    // Notify client
    await Notification.create({
      userId: order.clientId,
      type: 'milestone_added',
      title: 'New Milestone Added',
      message: `${req.user.firstName} added a new milestone: ${title}`,
      data: { orderId: order._id, milestone: order.milestones[order.milestones.length - 1] },
      link: `/client/orders/${order._id}`,
      priority: 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'Milestone added successfully',
      milestone: order.milestones[order.milestones.length - 1]
    });
  } catch (error) {
    console.error('Add milestone error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add milestone', 
      error: error.message 
    });
  }
};

// @desc    Update milestone
// @route   PUT /api/orders/:orderId/milestones/:milestoneId
// @access  Private (Provider only)
exports.updateMilestone = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;
    const updates = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only provider can update milestones
    if (order.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the provider can update milestones' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    // Can't update approved milestones
    if (milestone.status === 'approved') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot update approved milestones' 
      });
    }

    Object.assign(milestone, updates);
    await order.save();

    res.json({
      success: true,
      message: 'Milestone updated successfully',
      milestone
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update milestone', 
      error: error.message 
    });
  }
};

// @desc    Complete milestone (provider marks as done)
// @route   POST /api/orders/:orderId/milestones/:milestoneId/complete
// @access  Private (Provider only)
exports.completeMilestone = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;
    const { deliverables } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only provider can complete milestones
    if (order.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the provider can complete milestones' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    // Check if milestone is in correct state
    if (milestone.status !== 'in-progress' && milestone.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot complete milestone with status: ${milestone.status}` 
      });
    }

    milestone.status = 'completed';
    milestone.completedDate = new Date();
    
    if (deliverables) {
      milestone.deliverables = deliverables;
    }

    await order.save();

    // Update order status to review if all milestones completed
    const allCompleted = order.milestones.every(m => m.status === 'completed');
    if (allCompleted) {
      order.status = 'review';
      await order.save();
    }

    // Notify client
    await Notification.create({
      userId: order.clientId,
      type: 'milestone_completed',
      title: 'Milestone Completed',
      message: `${req.user.firstName} completed milestone: ${milestone.title}`,
      data: { orderId: order._id, milestone },
      link: `/client/orders/${order._id}`,
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Milestone marked as completed',
      milestone,
      orderStatus: order.status
    });
  } catch (error) {
    console.error('Complete milestone error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to complete milestone', 
      error: error.message 
    });
  }
};

// @desc    Approve milestone (client approves)
// @route   POST /api/orders/:orderId/milestones/:milestoneId/approve
// @access  Private (Client only)
exports.approveMilestone = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;
    const { feedback } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only client can approve milestones
    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the client can approve milestones' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    // Check if milestone is completed
    if (milestone.status !== 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only approve completed milestones' 
      });
    }

    milestone.status = 'approved';
    milestone.approvedDate = new Date();
    milestone.clientApproved = true;
    if (feedback) milestone.notes = feedback;

    // Update payment status for this milestone
    const paymentSchedule = order.paymentSchedule.find(
      p => p.milestoneId.toString() === milestoneId
    );
    if (paymentSchedule) {
      paymentSchedule.status = 'paid';
      paymentSchedule.paidAt = new Date();
    }

    await order.save();
    await order.updateProgress();

    // Release payment from escrow
    // This would integrate with payment processor
    const payment = await Payment.findOne({ 
      orderId: order._id, 
      milestoneId: milestone._id 
    });
    if (payment) {
      payment.status = 'completed';
      payment.completedAt = new Date();
      await payment.save();
    }

    // Check if order is completed
    if (order.progress === 100) {
      order.status = 'completed';
      order.completedDate = new Date();
      await order.save();

      // Update provider stats
      await User.findByIdAndUpdate(order.providerId, {
        $inc: { 'providerDetails.completedProjects': 1 }
      });
    }

    // Notify provider
    await Notification.create({
      userId: order.providerId,
      type: 'milestone_approved',
      title: 'Milestone Approved',
      message: `${req.user.firstName} approved milestone: ${milestone.title}`,
      data: { orderId: order._id, milestone, feedback },
      link: `/provider/orders/${order._id}`,
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Milestone approved successfully',
      milestone,
      progress: order.progress,
      orderStatus: order.status
    });
  } catch (error) {
    console.error('Approve milestone error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to approve milestone', 
      error: error.message 
    });
  }
};

// @desc    Request milestone revision
// @route   POST /api/orders/:orderId/milestones/:milestoneId/revision
// @access  Private (Client only)
exports.requestRevision = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;
    const { feedback } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only client can request revisions
    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the client can request revisions' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    // Check if milestone is completed
    if (milestone.status !== 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only request revision for completed milestones' 
      });
    }

    milestone.status = 'in-progress';
    milestone.notes = feedback;

    await order.save();

    // Notify provider
    await Notification.create({
      userId: order.providerId,
      type: 'revision_requested',
      title: 'Revision Requested',
      message: `${req.user.firstName} requested changes for milestone: ${milestone.title}`,
      data: { orderId: order._id, milestone, feedback },
      link: `/provider/orders/${order._id}`,
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Revision requested successfully',
      milestone
    });
  } catch (error) {
    console.error('Request revision error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to request revision', 
      error: error.message 
    });
  }
};

// ==================== DELIVERABLE MANAGEMENT ====================

// @desc    Upload deliverable for milestone
// @route   POST /api/orders/:orderId/milestones/:milestoneId/deliverables
// @access  Private (Provider only)
exports.uploadDeliverable = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Only provider can upload deliverables
    if (order.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the provider can upload deliverables' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    const deliverable = {
      filename: req.file.originalname,
      path: `/uploads/deliverables/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date()
    };

    if (!milestone.deliverables) {
      milestone.deliverables = [];
    }
    milestone.deliverables.push(deliverable);

    await order.save();

    // Auto-complete milestone if this is the first deliverable
    if (milestone.status === 'pending' || milestone.status === 'in-progress') {
      milestone.status = 'completed';
      milestone.completedDate = new Date();
      await order.save();
    }

    res.json({
      success: true,
      message: 'Deliverable uploaded successfully',
      deliverable
    });
  } catch (error) {
    console.error('Upload deliverable error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload deliverable', 
      error: error.message 
    });
  }
};

// @desc    Get deliverables for milestone
// @route   GET /api/orders/:orderId/milestones/:milestoneId/deliverables
// @access  Private
exports.getDeliverables = async (req, res) => {
  try {
    const { orderId, milestoneId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check authorization
    const isClient = order.clientId.toString() === req.user._id.toString();
    const isProvider = order.providerId.toString() === req.user._id.toString();

    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ 
        success: false,
        message: 'Milestone not found' 
      });
    }

    res.json({
      success: true,
      deliverables: milestone.deliverables || []
    });
  } catch (error) {
    console.error('Get deliverables error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch deliverables', 
      error: error.message 
    });
  }
};

// ==================== DISPUTE MANAGEMENT ====================

// @desc    Raise dispute on order
// @route   POST /api/orders/:orderId/dispute
// @access  Private
exports.raiseDispute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, description } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check authorization
    const isClient = order.clientId.toString() === req.user._id.toString();
    const isProvider = order.providerId.toString() === req.user._id.toString();

    if (!isClient && !isProvider) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    if (order.status === 'disputed') {
      return res.status(400).json({ 
        success: false,
        message: 'Dispute already raised for this order' 
      });
    }

    order.status = 'disputed';
    order.dispute = {
      raisedBy: req.user._id,
      reason,
      description,
      raisedAt: new Date(),
      status: 'pending'
    };

    await order.save();

    // Notify admin (you'd implement this differently)
    console.log('Dispute raised:', order.dispute);

    // Notify the other party
    const notifyUserId = isClient ? order.providerId : order.clientId;
    await Notification.create({
      userId: notifyUserId,
      type: 'dispute_raised',
      title: 'Dispute Raised',
      message: `A dispute has been raised on order: ${order.title}`,
      data: { orderId: order._id, dispute: order.dispute },
      link: isClient ? `/provider/orders/${order._id}` : `/client/orders/${order._id}`,
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Dispute raised successfully',
      dispute: order.dispute
    });
  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to raise dispute', 
      error: error.message 
    });
  }
};

// @desc    Resolve dispute (admin only)
// @route   POST /api/orders/:orderId/dispute/resolve
// @access  Private (Admin only)
exports.resolveDispute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolution, notes } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ 
        success: false,
        message: 'Order is not in disputed state' 
      });
    }

    order.status = resolution === 'refund' ? 'cancelled' : 'in-progress';
    order.dispute.status = 'resolved';
    order.dispute.resolvedAt = new Date();
    order.dispute.resolution = resolution;
    order.dispute.resolutionNotes = notes;

    await order.save();

    // Notify both parties
    await Notification.create({
      userId: order.clientId,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `The dispute on order ${order.title} has been resolved`,
      data: { orderId: order._id, resolution },
      link: `/client/orders/${order._id}`,
      priority: 'high'
    });

    await Notification.create({
      userId: order.providerId,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `The dispute on order ${order.title} has been resolved`,
      data: { orderId: order._id, resolution },
      link: `/provider/orders/${order._id}`,
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      order
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to resolve dispute', 
      error: error.message 
    });
  }
};

// ==================== REVIEW MANAGEMENT ====================

// @desc    Leave review for order
// @route   POST /api/orders/:orderId/review
// @access  Private
exports.leaveReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment, categories } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Can only review completed orders' 
      });
    }

    // Determine reviewer and reviewee
    const isClient = order.clientId.toString() === req.user._id.toString();
    const isProvider = order.providerId.toString() === req.user._id.toString();

    if (!isClient && !isProvider) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    // Check if already reviewed
    if (isClient && order.clientReview) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already reviewed this order' 
      });
    }

    if (isProvider && order.providerReview) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already reviewed this order' 
      });
    }

    const review = {
      rating,
      comment,
      categories,
      submittedAt: new Date()
    };

    if (isClient) {
      order.clientReview = review;
      // Update provider's rating
      await User.findByIdAndUpdate(order.providerId, {
        $inc: { 'providerDetails.totalReviews': 1 },
        $set: { 'providerDetails.rating': rating } // You'd calculate average here
      });
    } else {
      order.providerReview = review;
    }

    await order.save();

    // Notify the other party
    const notifyUserId = isClient ? order.providerId : order.clientId;
    await Notification.create({
      userId: notifyUserId,
      type: 'review_received',
      title: 'New Review Received',
      message: `${req.user.firstName} left a ${rating}-star review on your project`,
      data: { orderId: order._id, review },
      link: isClient ? `/provider/orders/${order._id}` : `/client/orders/${order._id}`,
      priority: 'medium'
    });

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Leave review error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit review', 
      error: error.message 
    });
  }
};

// ==================== ADMIN ROUTES ====================

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin/all
// @access  Private (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('clientId', 'firstName lastName email')
      .populate('providerId', 'firstName lastName email')
      .populate('rfqId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
};

// @desc    Get disputed orders (admin)
// @route   GET /api/orders/admin/disputes
// @access  Private (Admin only)
exports.getDisputedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'disputed' })
      .populate('clientId', 'firstName lastName email')
      .populate('providerId', 'firstName lastName email')
      .populate('rfqId', 'title')
      .sort({ 'dispute.raisedAt': -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get disputed orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch disputed orders', 
      error: error.message 
    });
  }
};

// @desc    Get messages for an order
// @route   GET /api/orders/:orderId/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify user is part of the order
    if (order.clientId.toString() !== req.user._id.toString() && 
        order.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these messages'
      });
    }

    const messages = await Message.find({ orderId })
      .populate('senderId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ orderId });

    // Mark messages as delivered/read
    await Message.updateMany(
      { orderId, receiverId: req.user._id, status: { $ne: 'read' } },
      { status: 'delivered' }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// @desc    Send a message in an order
// @route   POST /api/orders/:orderId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Determine receiver based on sender role
    let receiverId;
    if (order.clientId.toString() === req.user._id.toString()) {
      receiverId = order.providerId;
    } else if (order.providerId.toString() === req.user._id.toString()) {
      receiverId = order.clientId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to send messages in this order'
      });
    }

    const message = new Message({
      orderId,
      senderId: req.user._id,
      receiverId,
      type: 'text',
      text,
      status: 'sent'
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName avatar');

    // Create notification for receiver
    await Notification.create({
      userId: receiverId,
      type: 'message_received',
      title: 'New Message',
      message: `${req.user.firstName} sent you a message`,
      senderId: req.user._id,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      metadata: {
        orderId,
        conversationId: orderId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

module.exports = exports;