// models/GardenData.js
const mongoose = require('mongoose');

const GardenDataSchema = new mongoose.Schema({
  gardenId: {
    type: String,
    required: true,
    index: true
  },
  pH: {
    type: Number,
    required: true
  },
  EC: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('GardenData', GardenDataSchema);
