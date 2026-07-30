const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema({
  plant: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  variety: {
    type: String,
    trim: true,
    maxlength: 120,
    default: '',
  },
  type: {
    type: String,
    required: true,
    enum: ['seed', 'cutting', 'bulb', 'tuber', 'seedling'],
    lowercase: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  coordinates: {
    lat: { type: Number, min: -90, max: 90, default: null },
    lng: { type: Number, min: -180, max: 180, default: null },
  },
  exchangeType: {
    type: String,
    required: true,
    enum: ['trade', 'free', 'paid'],
    lowercase: true,
    trim: true,
  },
  price: {
    type: Number,
    min: 0,
    default: 0,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'completed', 'removed'],
    default: 'available',
    lowercase: true,
  },
}, {
  timestamps: true,
});

SeedExchangeSchema.index({ plant: 'text', variety: 'text', location: 'text' });
SeedExchangeSchema.index({ type: 1, status: 1 });
SeedExchangeSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);