const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  url: { type: String, required: true },
  events: [{ type: String }],
  active: { type: Boolean, default: true }
});
module.exports = mongoose.model('Webhook', schema);
