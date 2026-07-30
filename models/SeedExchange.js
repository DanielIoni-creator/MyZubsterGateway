const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  seedType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  imageUrl: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'exchanged', 'unavailable'],
    default: 'available'
  }
}, {
  timestamps: true
});

SeedExchangeSchema.index({ owner: 1 });
SeedExchangeSchema.index({ seedType: 1 });
SeedExchangeSchema.index({ status: 1 });
SeedExchangeSchema.index({ location: 1 });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);