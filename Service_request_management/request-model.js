const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // Requester Information
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterEmail: {
    type: String,
    required: true
  },
  requesterPhoto: {
    type: String,
    default: ''
  },

  // Request Details
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'web-dev',
      'graphic-design',
      'writing',
      'marketing',
      'video',
      'music',
      'programming',
      'business',
      'consulting',
      'handyman',
      'other'
    ]
  },
  
  // Budget & Pricing
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [1, 'Budget must be at least $1'],
    max: [1000000, 'Budget cannot exceed $1,000,000']
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly', 'negotiable'],
    default: 'fixed'
  },
  
  // Location & Timeline
  locationType: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    default: 'remote'
  },
  location: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Timeline
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  urgency: {
    type: String,
    enum: ['urgent', 'high', 'normal', 'low'],
    default: 'normal'
  },
  
  // Skills & Requirements
  skillsRequired: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  
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
  
  // Status & Metrics
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed', 'cancelled'],
    default: 'open'
  },
  offersCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Communication
  contactPreference: {
    type: String,
    enum: ['platform', 'email', 'phone', 'video'],
    default: 'platform'
  },
  allowMessages: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Indexes for faster queries
requestSchema.index({ title: 'text', description: 'text', tags: 'text' });
requestSchema.index({ category: 1, status: 1 });
requestSchema.index({ budget: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ requesterId: 1 });

// Virtual for offers
requestSchema.virtual('offers', {
  ref: 'Offer',
  localField: '_id',
  foreignField: 'requestId',
  justOne: false
});

// Middleware to update updatedAt
requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get all requests with filters
requestSchema.statics.getRequests = async function(filters = {}, page = 1, limit = 12) {
  const skip = (page - 1) * limit;
  
  const query = { isActive: true };
  
  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  
  if (filters.locationType && filters.locationType !== 'all') {
    query.locationType = filters.locationType;
  }
  
  if (filters.minBudget) {
    query.budget = { $gte: parseFloat(filters.minBudget) };
  }
  
  if (filters.maxBudget) {
    query.budget = { ...query.budget, $lte: parseFloat(filters.maxBudget) };
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  if (filters.requesterId) {
    query.requesterId = filters.requesterId;
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
  
  // Sorting
  let sort = { createdAt: -1 };
  if (filters.sort) {
    switch (filters.sort) {
      case 'budget-high':
        sort = { budget: -1 };
        break;
      case 'budget-low':
        sort = { budget: 1 };
        break;
      case 'deadline':
        sort = { deadline: 1 };
        break;
      case 'popular':
        sort = { offersCount: -1 };
        break;
    }
  }
  
  const requests = await this.find(query)
    .populate('requesterId', 'firstName lastName profilePhoto rating')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    requests,
    total,
    pages: Math.ceil(total / limit),
    page,
    limit
  };
};

// Instance method to increment views
requestSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;