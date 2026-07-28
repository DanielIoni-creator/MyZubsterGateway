const mongoose = require('mongoose');

const encryptedOrderSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  payloadType: {
    type: String,
    default: 'order.sensitive'
  },
  encryptedData: {
    type: String,
    required: true
  },
  keyFingerprint: {
    type: String,
    required: true
  },
  algorithm: {
    type: String,
    default: 'openpgp-rsa4096'
  }
}, {
  timestamps: true
});

encryptedOrderSchema.index({ order: 1, payloadType: 1 }, { unique: true });

module.exports = mongoose.model('EncryptedOrder', encryptedOrderSchema);
