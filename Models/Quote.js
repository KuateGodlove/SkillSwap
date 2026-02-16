module.exports = require('../Models/Quote');
// models/Quote.js
const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  rfqId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RFQ', 
    required: true 
  },
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Quote details
  amount: { type: Number, required: true },
  deliveryTime: String,
  proposal: { type: String, required: true },
  highlights: [String],
  
  // Attachments
  attachments: [{
    filename: String,
    path: String,
    size: Number
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'withdrawn'],
    default: 'pending'
  },
  
  // Client actions
  viewedByClient: { type: Boolean, default: false },
  clientFeedback: String,
  
  // Timestamps
  submittedAt: { type: Date, default: Date.now },
  respondedAt: Date, // When client accepted/declined
  
  // If accepted, link to order
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

// Index for fast queries
quoteSchema.index({ rfqId: 1, providerId: 1 }, { unique: true }); // One quote per provider per RFQ

module.exports = mongoose.model('Quote', quoteSchema);