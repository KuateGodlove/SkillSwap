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
    
    // Location
    locationType: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "remote"
    },
    
    location: {
      type: String,
      trim: true
    },
    
    // Time commitment
    estimatedTime: {
      type: Number,
      default: 1
    },
    
    timeUnit: {
      type: String,
      enum: ["hours", "days", "weeks", "months"],
      default: "days"
    },
    
    level: {
      type: String,
      enum: ["beginner", "intermediate", "expert"],
      default: "intermediate"
    },
    
    // Exchange Type
    exchangeType: {
      type: String,
      enum: ["direct_exchange", "mentorship", "collaboration", "learning"],
      default: "direct_exchange"
    },
    
    // SINGLE IMAGE - Simplified to match your route
    image: {
      type: String,
      default: ""
    },
    
    // Tags
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
    
    totalReviews: {
      type: Number,
      default: 0
    },
    
    // Exchange Statistics
    completedExchanges: {
      type: Number,
      default: 0
    },
    
    // Engagement Counters
    views: {
      type: Number,
      default: 0
    },
    
    likes: {
      type: Number,
      default: 0
    },
    
    inquiries: {
      type: Number,
      default: 0
    },
    
    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "archived"],
      default: "active"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for time display
serviceSchema.virtual('estimatedTimeDisplay').get(function() {
  return `${this.estimatedTime} ${this.timeUnit}`;
});

// Virtual for availability status
serviceSchema.virtual('isAvailable').get(function() {
  return this.status === "active" && this.availability !== "unavailable";
});

// Virtual for exchange type display
serviceSchema.virtual('exchangeTypeDisplay').get(function() {
  const displayMap = {
    direct_exchange: "Direct Exchange",
    mentorship: "Mentorship",
    collaboration: "Collaboration",
    learning: "Learning Opportunity"
  };
  return displayMap[this.exchangeType] || this.exchangeType;
});

// Text indexes for search
serviceSchema.index({ 
  title: "text", 
  description: "text", 
  tags: "text",
  skillsOffered: "text"
});

// Indexes for better query performance
serviceSchema.index({ category: 1 });
serviceSchema.index({ userId: 1, status: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ locationType: 1 });

// Middleware to handle comma-separated strings from frontend
serviceSchema.pre('save', function(next) {
  // Convert comma-separated strings to arrays
  if (typeof this.skillsOffered === 'string') {
    this.skillsOffered = this.skillsOffered
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill);
  }
  
  if (typeof this.skillsWanted === 'string') {
    this.skillsWanted = this.skillsWanted
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill);
  }
  
  if (typeof this.tags === 'string') {
    this.tags = this.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
  }
  
  next();
});

module.exports = mongoose.model("Service", serviceSchema);