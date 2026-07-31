const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plant: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Listing type is required'],
      enum: {
        values: ['seed', 'cutting', 'seedling', 'plant', 'bulb', 'tuber', 'other'],
        message: 'Type must be one of: seed, cutting, seedling, plant, bulb, tuber, other',
      },
      index: true,
    },
    variety: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      min: 0,
    },
    quantity: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'reserved', 'sold', 'unavailable'],
        message: 'Status must be one of: available, reserved, sold, unavailable',
      },
      default: 'available',
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

SeedExchangeSchema.index({ owner: 1, createdAt: -1 });
SeedExchangeSchema.index({ plant: 1, type: 1 });
SeedExchangeSchema.index({ location: 1 });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);
