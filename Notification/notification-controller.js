const mongoose = require('mongoose');
const Notification = require('./notification-model');
const User = require("../authentification/user-model");

// Helper function to create notification
const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type = 'all',
      read,
      important,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = { userId, archived: false };
    
    // Apply filters
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    if (important !== undefined) {
      query.important = important === 'true';
    }
    
    // Search in title and message
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { senderName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Notification.countDocuments(query);
    
    // Format notifications with timeAgo
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      timeAgo: getTimeAgo(notification.createdAt)
    }));

    res.status(200).json({
      success: true,
      data: {
        notifications: formattedNotifications,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    // Mark as read when viewed
    if (!notification.read) {
      notification.read = true;
      notification.openedAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: {
        ...notification.toObject(),
        timeAgo: getTimeAgo(notification.createdAt)
      }
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, read: false, archived: false },
      { $set: { read: true, openedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
exports.archiveNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this notification'
      });
    }

    await notification.archive();

    res.status(200).json({
      success: true,
      message: 'Notification archived',
      data: notification
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification',
      error: error.message
    });
  }
};

// @desc    Get unread count (for badge)
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { archive } = req.query;

    if (archive === 'true') {
      // Archive all notifications
      const result = await Notification.updateMany(
        { userId, archived: false },
        { $set: { archived: true } }
      );
      
      res.status(200).json({
        success: true,
        message: `Archived ${result.modifiedCount} notifications`,
        data: { modifiedCount: result.modifiedCount }
      });
    } else {
      // Delete all notifications
      const result = await Notification.deleteMany({ userId });
      
      res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} notifications`,
        data: { deletedCount: result.deletedCount }
      });
    }
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
};

// @desc    Create notification for offer received
// @route   POST /api/notifications/offer-received
// @access  Private
exports.createOfferReceivedNotification = async (req, res) => {
  try {
    const { userId, senderId, requestId, offerId, budget } = req.body;

    // Get sender info
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    const notification = await createNotification({
      userId,
      type: 'offer_received',
      title: 'New Offer Received',
      message: `${sender.firstName} ${sender.lastName} has sent you an offer with a budget of $${budget}`,
      metadata: {
        requestId,
        offerId,
        amount: budget,
        senderId
      },
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderPhoto: sender.profilePhoto || '',
      important: true,
      actions: [
        {
          label: 'View Offer',
          action: 'view_offer',
          link: `/offers/${offerId}`,
          method: 'GET'
        },
        {
          label: 'Accept',
          action: 'accept_offer',
          link: `/api/offers/${offerId}/accept`,
          method: 'PUT'
        },
        {
          label: 'Decline',
          action: 'decline_offer',
          link: `/api/offers/${offerId}/decline`,
          method: 'PUT'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create offer notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// @desc    Create notification for message received
// @route   POST /api/notifications/message-received
// @access  Private
exports.createMessageReceivedNotification = async (req, res) => {
  try {
    const { userId, senderId, conversationId, messagePreview } = req.body;

    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    const notification = await createNotification({
      userId,
      type: 'message_received',
      title: 'New Message',
      message: `${sender.firstName} ${sender.lastName} sent you a message`,
      metadata: {
        conversationId,
        senderId,
        messagePreview
      },
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderPhoto: sender.profilePhoto || '',
      important: true,
      actions: [
        {
          label: 'Reply',
          action: 'reply',
          link: `/messages/${conversationId}`,
          method: 'GET'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create message notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// @desc    Create notification for payment received
// @route   POST /api/notifications/payment-received
// @access  Private
exports.createPaymentReceivedNotification = async (req, res) => {
  try {
    const { userId, amount, transactionId } = req.body;

    const notification = await createNotification({
      userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of $${amount} has been successfully processed`,
      metadata: {
        amount,
        transactionId
      },
      important: true,
      actions: [
        {
          label: 'View Details',
          action: 'view_transaction',
          link: `/transactions/${transactionId}`,
          method: 'GET'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create payment notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// @desc    Create notification for request accepted
// @route   POST /api/notifications/request-accepted
// @access  Private
exports.createRequestAcceptedNotification = async (req, res) => {
  try {
    const { userId, acceptorId, requestId, requestTitle } = req.body;

    const acceptor = await User.findById(acceptorId);
    if (!acceptor) {
      return res.status(404).json({
        success: false,
        message: 'Acceptor not found'
      });
    }

    const notification = await createNotification({
      userId,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `Your request "${requestTitle}" has been accepted`,
      metadata: {
        requestId,
        acceptorId,
        requestTitle
      },
      senderId: acceptorId,
      senderName: `${acceptor.firstName} ${acceptor.lastName}`,
      senderPhoto: acceptor.profilePhoto || '',
      important: true,
      actions: [
        {
          label: 'View Request',
          action: 'view_request',
          link: `/requests/${requestId}`,
          method: 'GET'
        },
        {
          label: 'Message',
          action: 'message',
          link: `/messages/compose?to=${acceptorId}`,
          method: 'GET'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create request accepted notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}