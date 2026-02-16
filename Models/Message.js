const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation/Order Reference
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  
  // Sender & Recipient
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message Content
  type: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  text: String,
  
  // File/Media
  attachment: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: Date
  },
  
  // Message Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: Date,
  
  // Edited flag
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, { timestamps: true });

// Index for efficient queries
messageSchema.index({ orderId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ status: 1 });

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);
