const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  species: {
    type: String,
    required: true,
    trim: true
  },
  commonName: {
    type: String,
    trim: true
  },
  gps: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  photos: [{
    type: String
  }],
  age: {
    type: Number,
    min: 0
  },
  size: {
    type: String,
    enum: ['seedling', 'small', 'medium', 'ancient'],
    default: 'medium'
  },
  health: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moneroAddress: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

plantSchema.index({ gps: '2dsphere' });

module.exports = mongoose.model('Plant', plantSchema);
