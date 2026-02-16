const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: { type: String, required: true },
  proposedBudget: { type: Number, required: true },
  proposedTimeline: String,
  deliverables: [String],
  pricingBreakdown: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['draft','submitted','under-review','shortlisted','accepted','rejected'], default: 'submitted' },
  isViewed: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
