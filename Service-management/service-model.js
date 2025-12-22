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
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

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