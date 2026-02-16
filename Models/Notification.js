const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who will receive the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      'offer_received',       // When someone sends you an offer
      'offer_accepted',       // When your offer is accepted
      'offer_declined',       // When your offer is declined
      'message_received',     // When you receive a message
      'request_accepted',     // When your request is accepted
      'payment_received',     // When payment is received
      'review_received',      // When you receive a review
      'system_alert',         // System alerts
      'deadline_reminder',    // Deadline reminders
      'skill_match'           // Skill matching notifications
    ],
    index: true
  },
  
  // Notification title
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Notification message/content
  message: {
    type: String,
    required: true
  },
  
  // Metadata for linking to related resources
  metadata: {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    transactionId: { type: String },
    amount: { type: Number },
    rating: { type: Number }
  },
  
  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  senderName: {
    type: String,
    default: 'System'
  },
  
  senderPhoto: {
    type: String,
    default: ''
  },
  
  // Read status
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Important flag for highlighting
  important: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Archived flag (soft delete)
  archived: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Actions that can be taken from the notification
  actions: [{
    label: String,
    action: String,
    link: String,
    method: String
  }],
  
  // Track when notification was opened/clicked
  openedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, read: 1 });
notificationSchema.index({ userId: 1, important: 1, read: 1 });

// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
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
    return this.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.openedAt = new Date();
  return this.save();
};

// Method to archive
notificationSchema.methods.archive = function() {
  this.archived = true;
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ 
    userId, 
    read: false, 
    archived: false 
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
