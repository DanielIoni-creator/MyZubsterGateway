// models/index.js
const orderHook = require('./orderHook');
module.exports = {
  User: require('./User'),
  Order: require('./Order'),
  Skill: require('./Skill'),
  Offer: require('./Offer'),
  Request: require('./Request'),
  Transaction: require('./Transaction'),
  Review: require('./Review'),
  Webhook: require('./Webhook'),
  WebhookDelivery: require('./WebhookDelivery'),
  WebhookLog: require('./WebhookLog'),
  ActivityLog: require('./ActivityLog'),
  GardenReading: require('./GardenReading'),
};

// Register post-save order lifecycle listeners after all models are loaded.
orderHook.attach();
