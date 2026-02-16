// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8 
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  country: String,
  avatar: String,
  
  // Role & Status
  role: { 
    type: String, 
    enum: ['client', 'provider', 'admin'],
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: function() {
      return this.role === 'client' ? 'approved' : 'pending';
    }
  },
  
  // Common fields
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  emailVerified: { type: Boolean, default: false },
  
  // Provider specific (if role = provider)
  providerDetails: {
    businessName: String,
    yearsExperience: Number,
    specialization: String,
    skills: [String],
    hourlyRate: Number,
    minimumProjectSize: Number,
    portfolioUrl: String,
    linkedinUrl: String,
    githubUrl: String,
    certifications: [String],
    languages: [String],
    completedProjects: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    responseTime: String,
    memberSince: Date
  },
  
  // Client specific (if role = client)
  clientDetails: {
    companyName: String,
    jobTitle: String,
    companySize: String,
    industry: String,
    totalSpent: { type: Number, default: 0 },
    projectsPosted: { type: Number, default: 0 }
  },
  
  // Membership (for providers)
  membership: {
    tier: { 
      type: String, 
      enum: ['free', 'gold', 'platinum', 'diamond'],
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'expired', 'cancelled'],
      default: 'active' 
    },
    startDate: Date,
    expiryDate: Date,
    autoRenew: { type: Boolean, default: true },
    serviceLimit: { type: Number, default: 3 }, // Free tier: 3 services
    rfqQuota: { type: Number, default: 10 }, // Free tier: 10 RFQs/month
    paymentMethod: String,
    lastPayment: Date,
    paymentHistory: [{
      amount: Number,
      date: Date,
      transactionId: String,
      status: String
    }]
  }
}, { timestamps: true });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if provider is approved
userSchema.methods.isApprovedProvider = function() {
  return this.role === 'provider' && this.status === 'approved';
};

// Method to check if membership is active
userSchema.methods.hasActiveMembership = function() {
  if (this.role !== 'provider') return true; // Clients don't need membership
  return this.membership.status === 'active' && 
         this.membership.expiryDate > new Date();
};

module.exports = mongoose.model('User', userSchema);