// models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: String,
  subcategory: String,
  tags: [String],
  
  // Pricing
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'project']
  },
  price: Number,
  packages: [{
    name: String,
    price: Number,
    description: String,
    features: [String],
    popular: Boolean
  }],
  
  // Delivery
  deliveryTime: String,
  revisions: Number,
  
  // Media
  images: [String],
  portfolio: [{
    title: String,
    image: String,
    description: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused'],
    default: 'draft'
  },
  
  // Stats
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  
  // Featured
  featured: { type: Boolean, default: false }
}, { timestamps: true });

// Index for search
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', serviceSchema);