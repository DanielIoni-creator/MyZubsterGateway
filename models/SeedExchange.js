// models/SeedExchange.js
const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema({
  plant: {
    type: String,
    required: true,
    index: true
  },
  variety: {
    type: String,
    default: ''
  },
  type: {
    type: String, // e.g. 'seed', 'cutting', 'seedling', 'plant'
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  exchangeType: {
    type: String, // e.g. 'swap', 'gift', 'request'
    default: 'swap',
    index: true
  },
  locationName: {
    type: String,
    required: true,
    index: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [103.8198, 1.3521] // Default Singapore coords
    }
  },
  notes: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

SeedExchangeSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);
