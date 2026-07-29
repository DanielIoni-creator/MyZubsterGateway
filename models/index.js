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
};
// Side-effect: register Order lifecycle listeners that fan out webhook events
// for order.* state transitions. Trigger only fires after the document is
// persisted, so listeners see the canonical post-save state.
orderHook.attach();