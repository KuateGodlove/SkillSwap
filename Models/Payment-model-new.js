const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // References
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    index: true
  },
  
  // Payment Details
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank-transfer'],
    default: 'stripe'
  },
  
  // Associated IDs
  stripePaymentIntentId: String,
  paypalTransactionId: String,
  bankTransactionId: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Transaction Details
  description: String,
  invoiceNumber: String,
  receiptUrl: String,
  
  // Payment Type
  type: {
    type: String,
    enum: ['order-payment', 'membership', 'refund', 'withdrawal'],
    default: 'order-payment'
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Dates
  processedAt: Date,
  completedAt: Date,
  refundedAt: Date
}, { timestamps: true });

// Index for faster queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
