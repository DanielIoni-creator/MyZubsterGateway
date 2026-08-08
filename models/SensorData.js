// models/SensorData.js - Modello dati sensori
const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  gardenId: {
    type: String,
    required: true,
    index: true
  },
  ph: {
    type: Number,
    required: true
  },
  ec: {
    type: Number,
    default: null
  },
  temperature: {
    type: Number,
    default: null
  },
  humidity: {
    type: Number,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per performance
SensorDataSchema.index({ gardenId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', SensorDataSchema);
