const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // Basic Information
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['web-development', 'design', 'marketing', 'consulting', 'mobile', 'data']
  },
  skillsRequired: [String],
  
  // Client Information
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Budget & Timeline
  budgetType: { 
    type: String, 
    enum: ['fixed', 'hourly', 'negotiable'],
    default: 'fixed'
  },
  budgetRange: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' }
  },
  timeline: String, // e.g., "2-4 weeks"
  deadline: Date,
  
  // Project Details
  attachments: [String],
  requirements: [String],
  deliverables: [String],
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  inquiryMessage: String,
  
  // Status & Visibility
  status: { 
    type: String, 
    enum: ['draft', 'open', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  visibility: { 
    type: String, 
    enum: ['public', 'private', 'invite-only'],
    default: 'public'
  },
  isUrgent: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  
  // Proposals
  proposalsCount: { type: Number, default: 0 },
  proposals: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Proposal' 
  }],
  selectedProposal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Proposal' 
  },
  
  // Milestones & Payments
  milestones: [{
    title: String,
    description: String,
    amount: Number,
    dueDate: Date,
    status: { 
      type: String, 
      enum: ['pending', 'in-progress', 'completed', 'approved', 'paid'],
      default: 'pending'
    },
    completedAt: Date
  }],
  totalBudget: Number,
  paidAmount: { type: Number, default: 0 },
  
  // Timestamps
  postedAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  
  // Metrics
  views: { type: Number, default: 0 },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
