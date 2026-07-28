const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Webhook URL is required'],
    trim: true
  },
  events: {
    type: [String],
    required: [true, 'At least one webhook event is required'],
    validate: {
      validator(events) {
        return Array.isArray(events) && events.length > 0;
      },
      message: 'At least one webhook event is required'
    }
  },
  secret: {
    type: String,
    required: [true, 'Webhook signing secret is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 250
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  timeoutMs: {
    type: Number,
    default: 10000,
    min: 1000,
    max: 60000
  },
  lastDeliveryAt: {
    type: Date,
    default: null
  },
  lastDeliveryStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', null],
    default: null
  }
}, {
  timestamps: true
});

webhookSchema.index({ events: 1, active: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
