const mongoose = require('mongoose');

const gardenMetricSchema = new mongoose.Schema({
  gardenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garden', index: true },
  metric: {
    type: String,
    required: true,
    enum: ['temperature', 'humidity', 'soil_moisture', 'soil_ph', 'light_level', 'water_usage', 'harvest_yield']
  },
  value: { type: Number, required: true },
  unit: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
});

gardenMetricSchema.index({ gardenId: 1, metric: 1, timestamp: -1 });
gardenMetricSchema.index({ timestamp: -1 });

module.exports = mongoose.model('GardenMetric', gardenMetricSchema);
