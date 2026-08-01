const mongoose = require('mongoose');

const WebhookDeliverySchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookSubscription',
    required: true
  },
  event: {
    type: String,
    required: true
  },
  payload: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  response: {
    status: Number,
    body: Object
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
