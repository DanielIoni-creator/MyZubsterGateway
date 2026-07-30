const mongoose = require('mongoose');

const GardenReadingSchema = new mongoose.Schema({
  gardenId: { type: String, required: true, index: true },
  ph: { type: Number, min: 0, max: 14 },
  ec: { type: Number, min: 0 },  // Electrical conductivity (mS/cm)
  temperature: { type: Number },  // Celsius
  humidity: { type: Number, min: 0, max: 100 },  // Percentage
  soilMoisture: { type: Number, min: 0, max: 100 },
  lightLevel: { type: Number },  // Lux
  deviceId: { type: String },    // Arduino device identifier
  rawPayload: { type: mongoose.Schema.Types.Mixed },  // Original sensor data for extensibility
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for efficient time-series queries
GardenReadingSchema.index({ gardenId: 1, createdAt: -1 });

// TTL index: auto-delete readings older than 90 days to manage DB size
GardenReadingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('GardenReading', GardenReadingSchema);
