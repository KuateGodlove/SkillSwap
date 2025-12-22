const Notification = require('./notification-controller');
const userModel = require("../authentification/user-model");
const Request = require("../Service_request_management/request-model");
const Offer = require('../Make_offers/makeoffer-model');

// Utility: Create notification helper
const createNotification = async (data) => {
  try {
    const notification = await Notification.createNotification(data);
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
      dateRange,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      type: type !== 'all' ? type : undefined,
      read,
      important,
      search,
      dateRange
    };

    const result = await Notification.getUserNotifications(
      userId,
      filters,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          total: result.total,
          pages: result.pages,
          page: result.page,
          limit: result.limit
        },
        counts: result.counts
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
      data: notification
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

    notification.read = true;
    notification.openedAt = new Date();
    await notification.save();

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
      { userId, read: false },
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

// @desc    Delete multiple notifications
// @route   DELETE /api/notifications
// @access  Private
exports.deleteMultipleNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide notification IDs to delete'
      });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      userId
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Delete multiple notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
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

    notification.archived = true;
    await notification.save();

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

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
exports.getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Notification.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), archived: false } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
        },
        important: {
          $sum: { $cond: [{ $eq: ['$important', true] }, 1, 0] }
        },
        byType: {
          $push: {
            type: '$type',
            read: '$read'
          }
        }
      }}
    ]);

    // Calculate type-specific counts
    const typeStats = {};
    if (stats[0] && stats[0].byType) {
      stats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0 };
        }
        typeStats[item.type].total += 1;
        if (!item.read) {
          typeStats[item.type].unread += 1;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        total: stats[0]?.total || 0,
        unread: stats[0]?.unread || 0,
        important: stats[0]?.important || 0,
        byType: typeStats,
        readRate: stats[0] ? 
          ((stats[0].total - stats[0].unread) / stats[0].total * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics',
      error: error.message
    });
  }
};

// @desc    Track action click
// @route   POST /api/notifications/:id/action
// @access  Private
exports.trackAction = async (req, res) => {
  try {
    const { action } = req.body;
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
        message: 'Not authorized to track action for this notification'
      });
    }

    // Record the action click
    notification.clickedActions.push({
      action,
      clickedAt: new Date()
    });

    // Mark as read if not already
    if (!notification.read) {
      notification.read = true;
      notification.openedAt = new Date();
    }

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Action tracked successfully'
    });
  } catch (error) {
    console.error('Track action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track action',
      error: error.message
    });
  }
};

// @desc    Create notification (for internal use - e.g., from other controllers)
// @route   POST /api/notifications/create
// @access  Private (Admin/Internal)
exports.createNotificationForUser = async (req, res) => {
  try {
    const { userId, type, title, message, metadata, important, senderId } = req.body;

    // Get sender info if provided
    let senderName = 'System';
    let senderPhoto = '';
    let senderType = 'system';

    if (senderId) {
      const sender = await userModel.findById(senderId).select('firstName lastName profilePhoto');
      if (sender) {
        senderName = `${sender.firstName} ${sender.lastName}`;
        senderPhoto = sender.profilePhoto;
        senderType = 'user';
      }
    }

    const notificationData = {
      userId,
      type,
      title,
      message,
      metadata,
      important: important || false,
      senderId: senderId || null,
      senderName,
      senderPhoto,
      senderType,
      read: false,
      archived: false
    };

    // Add actions based on type
    switch (type) {
      case 'offer':
        notificationData.actions = [
          { label: 'View Offer', action: 'view', link: `/offers/${metadata.offerId}`, method: 'GET' },
          { label: 'Accept', action: 'accept', link: `/api/offers/${metadata.offerId}/accept`, method: 'PUT' },
          { label: 'Decline', action: 'decline', link: `/api/offers/${metadata.offerId}/decline`, method: 'PUT' }
        ];
        break;
      case 'message':
        notificationData.actions = [
          { label: 'Reply', action: 'reply', link: `/messages/${metadata.conversationId}`, method: 'GET' },
          { label: 'View', action: 'view', link: `/messages/${metadata.conversationId}`, method: 'GET' }
        ];
        break;
      case 'request':
        notificationData.actions = [
          { label: 'View Request', action: 'view', link: `/requests/${metadata.requestId}`, method: 'GET' },
          { label: 'Make Offer', action: 'offer', link: `/offers/create/${metadata.requestId}`, method: 'GET' }
        ];
        break;
    }

    const notification = await createNotification(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
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

    const count = await Notification.countDocuments({
      userId,
      read: false,
      archived: false
    });

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
    const { archive } = req.query; // Option to archive instead of delete

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