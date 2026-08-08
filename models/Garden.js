const mongoose = require('mongoose');

const gardenSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: v => v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'Invalid coordinates'
      }
    }
  },
  area_sqm: { type: Number, required: true, min: 1 },
  crops: [{ type: String }],
  description: { type: String, default: '' },
  photos: [{ type: String }],
  owner: { type: String },
  isActive: { type: Boolean, default: true },
  lastHarvest: { type: Date }
}, { timestamps: true });

gardenSchema.index({ location: '2dsphere' });
gardenSchema.index({ crops: 1 });
gardenSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Garden', gardenSchema);
