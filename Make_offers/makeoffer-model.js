const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  providerName: {
    type: String,
    required: true
  },
  
  providerEmail: {
    type: String,
    required: true
  },
  
  providerPhoto: String,
  
  providerRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  // Skills the provider offers
  skillsOffered: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one skill must be offered'
    }
  },
  
  // Time commitment (NO MONEY)
  estimatedTime: {
    type: Number,
    required: true
  },
  
  timeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks'],
    required: true,
    default: 'days'
  },
  
  // Estimated completion date
  estimatedCompletion: {
    type: Date,
    required: true
  },
  
  // Cover letter/proposal
  proposalMessage: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Availability details
  availability: {
    flexible: {
      type: Boolean,
      default: false
    },
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    timeSlots: [{
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    }],
    timezone: String
  },
  
  // What provider expects in return (for negotiation)
  isNegotiable: {
    type: Boolean,
    default: true
  },
  
  skillsExpected: {
    type: [String], // Skills the provider wants to learn or exchange for
    default: []
  },
  
  // Portfolio/reference files
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  
  // Communication/Messages
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: String,
    message: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isSystemMessage: {
      type: Boolean,
      default: false
    }
  }],
  
  // Negotiation history
  negotiations: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userType: {
      type: String,
      enum: ['requester', 'provider']
    },
    skillsOffered: [String],
    proposedTimeline: Object,
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Offer status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Status timestamps
  acceptedAt: Date,
  rejectedAt: Date,
  withdrawnAt: Date,
  completedAt: Date,
  
  // Ratings & feedback
  requesterRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  providerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  requesterFeedback: String,
  providerFeedback: String
}, {
  timestamps: true
});

// Indexes for better query performance
offerSchema.index({ requestId: 1, status: 1 });
offerSchema.index({ providerId: 1, status: 1 });
offerSchema.index({ status: 1, createdAt: -1 });
offerSchema.index({ requestId: 1, providerId: 1 });
offerSchema.index({ skillsOffered: 1 });

// Virtual for time display
offerSchema.virtual('estimatedTimeDisplay').get(function() {
  return `${this.estimatedTime} ${this.timeUnit}`;
});

// Ensure virtuals are included in JSON
offerSchema.set('toJSON', { virtuals: true });

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;