// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // References
  rfqId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RFQ', 
    required: true 
  },
  quoteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quote', 
    required: true 
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Project details
  title: String,
  description: String,
  amount: Number,
  
  // Milestones
  milestones: [{
    title: String,
    description: String,
    amount: Number,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'approved'],
      default: 'pending'
    },
    completedDate: Date,
    deliverables: [{
      filename: String,
      path: String,
      uploadedAt: Date
    }],
    clientApproved: Boolean
  }],
  
  // Progress
  progress: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Timeline
  startDate: Date,
  deadline: Date,
  completedDate: Date,
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded'],
    default: 'pending'
  },
  escrowBalance: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  
  // Tracking
  lastActivity: Date,
  unreadMessages: { type: Number, default: 0 }
}, { timestamps: true });

// Method to update progress based on milestones
orderSchema.methods.updateProgress = function() {
  const completed = this.milestones.filter(m => m.status === 'approved').length;
  this.progress = Math.round((completed / this.milestones.length) * 100);
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);