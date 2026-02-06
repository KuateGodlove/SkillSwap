const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required']
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  detailedDescription: {
    type: String,
    maxlength: [5000, 'Detailed description cannot exceed 5000 characters']
  },
  
  category: {
    type: String,
    enum: ['programming', 'design', 'writing', 'marketing', 'business', 'education', 'other'],
    default: 'other'
  },
  
  // Skills required - SKILL EXCHANGE FOCUS
  skillsRequired: [{
    type: String,
    trim: true
  }],
  
  // Time-based requirements (NO MONEY)
  estimatedTime: {
    type: Number,
    required: [true, 'Estimated time is required'],
    min: [1, 'Estimated time must be at least 1']
  },
  
  timeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks'],
    default: 'days'
  },
  
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  
  // Location
  locationType: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    default: 'remote'
  },
  
  location: {
    type: String,
    default: ''
  },
  
  // Skill exchange details
  skillsCanOffer: {
    type: [String],
    default: []
  },
  
  exchangeType: {
    type: String,
    enum: ['direct_exchange', 'mentorship', 'collaboration', 'learning'],
    default: 'direct_exchange'
  },
  
  // Contact preference
  contactPreference: {
    type: String,
    enum: ['platform', 'email', 'phone', 'meeting'],
    default: 'platform'
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Status
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed', 'cancelled'],
    default: 'open'
  },
  
  // Selected offer
  selectedOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Requester info (denormalized for performance)
  requesterName: {
    type: String,
    default: ''
  },
  
  requesterEmail: {
    type: String,
    default: ''
  },
  
  requesterPhoto: {
    type: String,
    default: ''
  },
  
  // Requester's average rating (from User model)
  requesterRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  // Files/attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  
  // Stats
  offersCount: {
    type: Number,
    default: 0
  },
  
  views: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Completion tracking
  completedAt: Date,
  
  // Ratings given AFTER exchange completion
  requesterRatingGiven: {  // Rating the requester gave to provider
    type: Number,
    min: 1,
    max: 5
  },
  
  providerRatingGiven: {   // Rating the provider gave to requester
    type: Number,
    min: 1,
    max: 5
  },
  
  feedbackFromRequester: String,  // Feedback from requester to provider
  feedbackFromProvider: String,   // Feedback from provider to requester
  
  // Status history
  statusHistory: [{
    status: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    reason: String,
    changedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for performance
requestSchema.index({ requesterId: 1, status: 1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ skillsRequired: 1 });
requestSchema.index({ locationType: 1 });
requestSchema.index({ category: 1 });
requestSchema.index({ isActive: 1, status: 1 });

// Virtual for display
requestSchema.virtual('timeRequiredDisplay').get(function() {
  return `${this.estimatedTime} ${this.timeUnit}`;
});

// Ensure virtuals are included in JSON
requestSchema.set('toJSON', { virtuals: true });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;