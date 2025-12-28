const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serviceSchema = new Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
      maxLength: [100, "Title cannot exceed 100 characters"]
    },
    
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxLength: [2000, "Description cannot exceed 2000 characters"]
    },
    
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Technology",
        "Design & Creative", 
        "Writing & Translation",
        "Marketing",
        "Business",
        "Education",
        "Health & Wellness",
        "Other"
      ]
    },
    
    subcategory: {
      type: String,
      trim: true
    },
    
    // Skills Information
    skillsOffered: [{
      type: String,
      trim: true
    }],
    
    skillsWanted: [{
      type: String,
      trim: true
    }],
    
    // Location & Duration
    locationType: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "remote"
    },
    
    location: {
      type: String,
      trim: true
    },
    
    duration: {
      type: String,
      trim: true
    },
    
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate"
    },
    
    // Budget & Pricing
    budgetType: {
      type: String,
      enum: ["swap", "hourly", "fixed"],
      default: "swap"
    },
    
    budgetValue: {
      type: Number,
      min: 0,
      default: 0
    },
    
    currency: {
      type: String,
      default: "USD"
    },
    
    // Media & Metadata
    images: [{
      type: String, // Store image URLs
      trim: true
    }],
    
    coverImage: {
      type: String,
      default: ""
    },
    
    // Tags & Search
    tags: [{
      type: String,
      trim: true
    }],
    
    // Availability
    availability: {
      type: String,
      enum: ["flexible", "immediate", "scheduled"],
      default: "flexible"
    },
    
    preferredTime: {
      type: String,
      trim: true
    },
    
    // Provider Information
    providerName: {
      type: String,
      default: ""
    },
    
    providerPhoto: {
      type: String,
      default: ""
    },
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    // Ratings & Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    
    reviewsCount: {
      type: Number,
      default: 0
    },
    
    // Status & Visibility
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "archived"],
      default: "active"
    },
    
    // View & Engagement Counters
    views: {
      type: Number,
      default: 0
    },
    
    likes: {
      type: Number,
      default: 0
    },
    
    requests: {
      type: Number,
      default: 0
    },
    
    // Exchange Information (for matching)
    exchangeFor: {
      type: String,
      trim: true
    },

  // Add these new fields for enhanced service details:
  detailedDescription: {
    type: String,
    maxlength: [20000, 'Detailed description cannot exceed 20000 characters']
  },
  
  estimatedTime: {
    type: String,
    required: false
  },
  
  timeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks', 'months'],
    default: 'days'
  },
  
  revisions: {
    type: Number,
    default: 1,
    min: [0, 'Revisions cannot be negative']
  },
  
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  packages: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    description: String,
    features: [String],
    deliveryTime: String,
    popular: {
      type: Boolean,
      default: false
    }
  }],
  
  requirements: [{
    type: String,
    trim: true
  }],
  
  faqs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Stats for service details page
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  totalReviews: {
    type: Number,
    default: 0
  },
  
  totalOrders: {
    type: Number,
    default: 0
  },
  
  views: {
    type: Number,
    default: 0
  },
  
  likes: {
    type: Number,
    default: 0
  },
  
  bookmarks: {
    type: Number,
    default: 0
  },
  
  // Availability settings
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable', 'flexible'],
    default: 'flexible'
  },
  
  maxOrders: {
    type: Number,
    default: 5
  },
  
  currentOrders: {
    type: Number,
    default: 0
  },
  
  // Location settings
  locationType: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    default: 'remote'
  },
  
  // Timestamps
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

// Virtual for average delivery time
serviceSchema.virtual('averageDeliveryTime').get(function() {
  if (this.packages && this.packages.length > 0) {
    const totalDays = this.packages.reduce((sum, pkg) => {
      if (pkg.deliveryTime) {
        const days = parseInt(pkg.deliveryTime) || 0;
        return sum + days;
      }
      return sum;
    }, 0);
    return totalDays / this.packages.length;
  }
  return null;
});

// Virtual for starting price
serviceSchema.virtual('startingPrice').get(function() {
  if (this.packages && this.packages.length > 0) {
    return Math.min(...this.packages.map(pkg => pkg.price));
  }
  return this.budgetValue || 0;
});

// Virtual for availability status
serviceSchema.virtual('isAvailable').get(function() {
  return this.status === "active" && 
         this.availability === "available" &&
         this.currentOrders < this.maxOrders;
});

// Indexes
serviceSchema.index({ title: 'text', description: 'text', detailedDescription: 'text', tags: 'text' });
serviceSchema.index({ category: 1, subcategory: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ totalOrders: -1 });
serviceSchema.index({ createdAt: -1 });

// Middleware to update updatedAt
serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total budget value
serviceSchema.virtual('totalBudget').get(function() {
  if (this.budgetType === 'swap') {
    return 'Skill Swap';
  }
  return `${this.currency} ${this.budgetValue}`;
});

// Indexes for better query performance
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ userId: 1 });
serviceSchema.index({ createdAt: -1 });

// Middleware to handle comma-separated strings from frontend
serviceSchema.pre('save', function(next) {
  // Convert comma-separated strings to arrays
  if (typeof this.skillsOffered === 'string') {
    this.skillsOffered = this.skillsOffered.split(',').map(skill => skill.trim()).filter(skill => skill);
  }
  
  if (typeof this.skillsWanted === 'string') {
    this.skillsWanted = this.skillsWanted.split(',').map(skill => skill.trim()).filter(skill => skill);
  }
  
  if (typeof this.tags === 'string') {
    this.tags = this.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  // Set cover image from first uploaded image
  if (this.images && this.images.length > 0 && !this.coverImage) {
    this.coverImage = this.images[0];
  }
  
  next();
});

module.exports = mongoose.model("Service", serviceSchema);