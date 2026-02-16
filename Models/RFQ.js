// models/RFQ.js
const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  // Basic Info
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: String,
  
  // Client
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  clientCompany: String,
  
  // Budget
  budgetType: { 
    type: String, 
    enum: ['fixed', 'hourly'],
    default: 'fixed' 
  },
  budgetMin: { type: Number, required: true },
  budgetMax: { type: Number, required: true },
  
  // Timeline
  timeline: String,
  startDate: Date,
  deadline: Date,
  
  // Requirements
  skills: [String],
  experience: {
    type: String,
    enum: ['entry', 'intermediate', 'expert']
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    uploadedAt: Date
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'completed'],
    default: 'active'
  },
  
  // Tracking
  views: { type: Number, default: 0 },
  quotes: { type: Number, default: 0 },
  invitedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Dates
  postedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  completedAt: Date,
  
  // Winner
  selectedQuoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  selectedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for search
rfqSchema.index({ 
  title: 'text', 
  description: 'text', 
  skills: 'text' 
});

// Virtual to check if expired
rfqSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to increment views
rfqSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('RFQ', rfqSchema);