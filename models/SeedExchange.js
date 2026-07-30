const mongoose = require('mongoose');

const seedExchangeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  species: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  variety: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'GBP']
  },
  category: {
    type: String,
    enum: ['seed', 'talee', 'plant', 'other'],
    required: true
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  location: {
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true }
  },
  images: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
}, { timestamps: true });

// Indexes for query performance
seedExchangeSchema.index({ userId: 1 });
seedExchangeSchema.index({ category: 1, isActive: 1 });
seedExchangeSchema.index({ species: 'text', variety: 'text', description: 'text' });

module.exports = mongoose.model('SeedExchange', seedExchangeSchema);
