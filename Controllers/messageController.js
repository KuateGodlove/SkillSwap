// controllers/messageController.js
const Message = require('../Models/Message');
const Order = require('../Models/Order');
const Notification = require('../Models/Notification');

// @desc    Get messages for an order
// @route   GET /api/messages/orders/:orderId
// @access  Private
exports.getOrderMessages = async (req, res) => {
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
    if (
      order.clientId.toString() !== req.user._id.toString() &&
      order.providerId.toString() !== req.user._id.toString()
    ) {
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

    // Mark messages as delivered
    await Message.updateMany(
      { orderId, receiverId: req.user._id, status: { $ne: 'read' } },
      { status: 'delivered' }
    );

    const normalized = messages.reverse().map(m => {
      const obj = m.toObject({ getters: true });
      return { ...obj, id: obj._id };
    });

    res.json({
      success: true,
      messages: normalized,
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
// @route   POST /api/messages/orders/:orderId
// @access  Private
exports.sendOrderMessage = async (req, res) => {
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

    // Create notification and emit via socket
    const notification = await Notification.create({
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

    const io = req.app.get('io');
    if (io) {
      const obj = message.toObject({ getters: true });
      const broadcastData = { ...obj, id: obj._id, orderId };
      io.to(orderId).emit('receiveMessage', broadcastData);
      io.to(receiverId.toString()).emit('newNotification', notification);
    }

    const obj = message.toObject({ getters: true });
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { ...obj, id: obj._id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Mark a message as read
// @route   PATCH /api/messages/:messageId/read
// @access  Private
exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this message'
      });
    }

    message.status = 'read';
    message.readAt = new Date();
    await message.save();

    const obj = message.toObject({ getters: true });
    res.json({
      success: true,
      message: 'Message marked as read',
      data: { ...obj, id: obj._id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
};

