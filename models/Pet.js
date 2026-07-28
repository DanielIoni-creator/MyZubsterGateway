const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  species: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'horse', 'bird', 'rabbit', 'fish', 'reptile', 'other']
  },
  breed: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  nfcId: {
    type: String,
    unique: true,
    sparse: true
  },
  gps: {
    lat: { type: Number },
    lng: { type: Number }
  },
  photos: [{
    type: String
  }],
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
  medicalRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthRecord'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

petSchema.index({ nfcId: 1 });

module.exports = mongoose.model('Pet', petSchema);
