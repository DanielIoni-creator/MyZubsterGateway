const mongoose = require('mongoose');

const GardenDataSchema = new mongoose.Schema({
  gardenId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
    index: true,
  },
  ph: {
    type: Number,
    min: 0,
    max: 14,
  },
  ec: {
    type: Number,
    min: 0,
  },
  temperature: {
    type: Number,
    min: -50,
    max: 100,
  },
  humidity: {
    type: Number,
    min: 0,
    max: 100,
  },
  moisture: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  light: {
    type: Number,
    min: 0,
    default: null,
  },
  co2: {
    type: Number,
    min: 0,
    default: null,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

GardenDataSchema.index({ gardenId: 1, receivedAt: -1 });

module.exports = mongoose.model('GardenData', GardenDataSchema);