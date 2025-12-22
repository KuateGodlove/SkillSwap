const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Notification Content
  type: {
    type: String,
    enum: [
      'offer',           // New offer on request
      'message',         // New message
      'request',         // New request matching skills
      'request_update',  // Request status changed
      'offer_accepted',  // Offer was accepted
      'offer_declined',  // Offer was declined
      'payment',         // Payment received/sent
      'review',          // New review received
      'system',          // System notifications
      'reminder',        // Deadline reminders
      'alert'            // Important alerts
    ],
    required: [true, 'Notification type is required']
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  // Sender Information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderName: String,
  senderPhoto: String,
  senderType: {
    type: String,
    enum: ['user', 'system', 'admin'],
    default: 'user'
  },
  
  // Metadata for actions
  metadata: {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    transactionId: String,
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    },
    projectId: String,
    amount: Number,
    deadline: Date,
    link: String, // URL for deep linking
    extraData: mongoose.Schema.Types.Mixed
  },
  
  // Status
  read: {
    type: Boolean,
    default: false
  },
  important: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  
  // Actions
  actions: [{
    label: String,
    action: String, // 'view', 'accept', 'decline', 'reply', 'complete', 'extend'
    link: String,
    method: String, // 'GET', 'POST', 'PUT', 'DELETE'
    endpoint: String
  }],
  
  // Expiration & Timing
  expiresAt: Date,
  scheduledFor: Date, // For delayed/scheduled notifications
  
  // Analytics
  openedAt: Date,
  clickedActions: [{
    action: String,
    clickedAt: Date
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, read: 1 });
notificationSchema.index({ userId: 1, important: 1, read: 1 });
notificationSchema.index({ userId: 1, archived: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// Middleware to update updatedAt
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for relative time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    
    // Emit socket event for real-time notification (if implemented)
    // io.to(`user_${data.userId}`).emit('new_notification', notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications with filters
notificationSchema.statics.getUserNotifications = async function(userId, filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const query = { userId, archived: false };
  
  // Apply filters
  if (filters.type && filters.type !== 'all') {
    query.type = filters.type;
  }
  
  if (filters.read === 'unread') {
    query.read = false;
  } else if (filters.read === 'read') {
    query.read = true;
  }
  
  if (filters.important) {
    query.important = true;
  }
  
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { message: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  // Date range filter
  if (filters.dateRange) {
    const days = parseInt(filters.dateRange);
    if (days > 0) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      query.createdAt = { $gte: dateThreshold };
    }
  }
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  // Get counts by type
  const counts = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), archived: false } },
    { $group: {
      _id: '$type',
      count: { $sum: 1 },
      unread: {
        $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
      }
    }}
  ]);
  
  const typeCounts = counts.reduce((acc, item) => {
    acc[item._id] = { total: item.count, unread: item.unread };
    return acc;
  }, {});
  
  return {
    notifications,
    total,
    pages: Math.ceil(total / limit),
    page,
    limit,
    counts: {
      all: total,
      unread: await this.countDocuments({ userId, read: false, archived: false }),
      important: await this.countDocuments({ userId, important: true, archived: false }),
      ...typeCounts
    }
  };
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;