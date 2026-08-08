const mongoose = require('mongoose');

const GardenReadingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gardenId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    ph: {
      type: Number,
      required: true,
      min: 0,
      max: 14,
    },
    ec: {
      type: Number,
      required: true,
      min: 0,
    },
    temperature: {
      type: Number,
      required: true,
      min: -50,
      max: 100,
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

GardenReadingSchema.index({ owner: 1, gardenId: 1, receivedAt: -1 });

module.exports = mongoose.model('GardenReading', GardenReadingSchema);
