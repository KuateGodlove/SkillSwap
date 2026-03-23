const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'XAF',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'processing', 'refunded'],
    default: 'pending',
    index: true,
  },
  type: {
    type: String,
    enum: ['order-payment', 'subscription', 'payout', 'refund'],
    required: true,
    index: true,
  },
  paymentMethod: {
    type: String,
  },
  invoiceNumber: {
    type: String,
    default: () => `INV-${nanoid()}`,
    unique: true,
  },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

module.exports = mongoose.model('Payment', paymentSchema);