const mongoose = require('mongoose');

const GardenReadingSchema = new mongoose.Schema({
  gardenId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  ph: {
    type: Number,
    required: true,
    min: 0,
    max: 14
  },
  temperature: {
    type: Number,
    required: true,
    min: -50,
    max: 60
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  soilMoisture: {
    type: Number,
    min: 0,
    max: 100
  },
  lightIntensity: {
    type: Number,
    min: 0
  },
  co2: {
    type: Number,
    min: 0
  },
  pressure: {
    type: Number,
    min: 0
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  sensorId: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GardenReading', GardenReadingSchema);