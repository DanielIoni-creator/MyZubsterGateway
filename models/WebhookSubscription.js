const mongoose = require('mongoose');

const WebhookSubscriptionSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  events: {
    type: [String],
    required: true
  },
  secret: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WebhookSubscription', WebhookSubscriptionSchema);
