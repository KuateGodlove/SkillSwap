const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  // Request reference
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  
  // Provider information
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  providerEmail: String,
  providerPhoto: String,
  providerRating: {
    type: Number,
    default: 0
  },
  
  // Offer details
  proposedBudget: {
    type: Number,
    required: [true, 'Proposed budget is required'],
    min: [0, 'Budget cannot be negative']
  },
  originalBudget: Number, // Store original request budget for comparison
  
  // Timeline
  estimatedTime: {
    type: String,
    required: [true, 'Estimated time is required']
  },
  timeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks', 'months'],
    default: 'days'
  },
  
  // Proposal
  coverLetter: {
    type: String,
    required: [true, 'Cover letter is required'],
    minlength: [50, 'Cover letter must be at least 50 characters'],
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  
  // Pricing strategy
  pricingStrategy: {
    type: String,
    enum: ['fixed', 'hourly', 'milestone'],
    default: 'fixed'
  },
  milestoneDetails: String,
  hourlyRate: Number,
  
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
    default: 'pending'
  },
  
  // Communication
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  
  // Negotiation
  isNegotiable: {
    type: Boolean,
    default: true
  },
  revisions: [{
    budget: Number,
    timeline: String,
    message: String,
    proposedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected']
    }
  }],
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date(this.createdAt);
      date.setDate(date.getDate() + 7); // Offers expire in 7 days
      return date;
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
offerSchema.index({ requestId: 1, status: 1 });
offerSchema.index({ providerId: 1, status: 1 });
offerSchema.index({ createdAt: -1 });
offerSchema.index({ expiresAt: 1 });

// Virtual for time remaining
offerSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const expires = new Date(this.expiresAt);
  const diffMs = expires - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for savings percentage
offerSchema.virtual('savingsPercentage').get(function() {
  if (!this.originalBudget) return 0;
  const savings = ((this.originalBudget - this.proposedBudget) / this.originalBudget) * 100;
  return Math.round(savings * 100) / 100;
});

// Middleware
offerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create offer
offerSchema.statics.createOffer = async function(data) {
  try {
    const offer = new this(data);
    await offer.save();
    
    // Update request's offers count
    const Request = mongoose.model('Request');
    await Request.findByIdAndUpdate(data.requestId, {
      $inc: { offersCount: 1 }
    });
    
    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;