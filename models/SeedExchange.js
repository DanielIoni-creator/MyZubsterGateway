const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    variety: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    type: {
      type: String,
      required: true,
      enum: ['seeds', 'cuttings', 'seedlings', 'bulbs'],
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 1000000,
      set(value) {
        if (typeof value === 'boolean' || Array.isArray(value) || (value && typeof value === 'object')) {
          return Number.NaN;
        }
        return value;
      },
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer',
      },
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
      index: true,
    },
    availability: {
      type: String,
      enum: ['immediate', 'seasonal'],
      default: 'immediate',
      index: true,
    },
    exchangeType: {
      type: String,
      enum: ['free', 'barter', 'donation'],
      default: 'free',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  { timestamps: true }
);

SeedExchangeSchema.index({ plantName: 1, type: 1, location: 1, createdAt: -1 });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);
