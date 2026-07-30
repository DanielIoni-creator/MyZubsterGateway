const mongoose = require('mongoose');

const SeedExchangeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    plant: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    variety: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    type: {
      type: String,
      enum: ['vegetable', 'herb', 'flower', 'fruit', 'grain', 'other'],
      default: 'other',
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
      index: true,
    },
    exchangeType: {
      type: String,
      enum: ['give', 'swap', 'sell'],
      default: 'give',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SeedExchangeSchema.index({ plant: 1, type: 1 });
SeedExchangeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SeedExchange', SeedExchangeSchema);
