const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic info
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false // Exclude by default
    },
    
    phone: {
      type: String,
      default: ''
    },
    
    // Profile
    profilePhoto: {
      type: String,
      default: '' // Will use placeholder in frontend if empty
    },
    
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    
    location: {
      type: String,
      default: ''
    },
    
    // Availability for skill exchange
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
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    
    // Languages spoken
    languages: [{
      type: String,
      trim: true
    }],
    
    // Skills user has (for offering in exchanges)
    skills: [{
      title: {
        type: String,
        required: true,
        trim: true
      },
      category: {
        type: String,
        enum: ['programming', 'design', 'writing', 'marketing', 'business', 'education', 'other'],
        required: true
      },
      level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Expert'],
        required: true,
        default: 'Intermediate'
      },
      description: {
        type: String,
        maxlength: 500
      },
      portfolio: [
        {
          title: String,
          url: String,
          description: String
        }
      ],
      yearsOfExperience: {
        type: Number,
        default: 0
      }
    }],
    
    // Skills user wants to learn (for requests)
    skillsToLearn: [{
      type: String,
      trim: true
    }],
    
    // Contact preference
    contactPreference: {
      type: String,
      enum: ['platform', 'email', 'phone', 'meeting'],
      default: 'platform'
    },
    
    // Notification preferences
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      skillMatches: {
        type: Boolean,
        default: true
      },
      offerUpdates: {
        type: Boolean,
        default: true
      }
    },
    
    // Ratings & Reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },
    
    // Statistics
    completedExchanges: {
      type: Number,
      default: 0
    },
    
    skillsCompleted: {
      type: Number,
      default: 0
    },
    
    offersReceived: {
      type: Number,
      default: 0
    },
    
    offersAccepted: {
      type: Number,
      default: 0
    },
    
    // Verification
    isVerified: {
      email: {
        type: Boolean,
        default: false
      },
      phone: {
        type: Boolean,
        default: false
      },
      identity: {
        type: Boolean,
        default: false
      }
    },
    
    // Account status
    isActive: {
      type: Boolean,
      default: true
    },
    
    isSuspended: {
      type: Boolean,
      default: false
    },
    
    suspensionReason: String,
    
    // Last activity
    lastLogin: Date,
    
    // Email verification token
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password reset token
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ rating: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });

// Hide sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;