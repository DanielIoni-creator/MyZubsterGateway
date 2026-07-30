const mongoose = require('mongoose');
const escrowOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  buyer: { type: String, required: true },
  seller: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'XMR' },
  status: { type: String, enum: ['pending','funded','completed','disputed','refunded'], default: 'pending' },
  multisigAddress: { type: String, default: null },
  aiAgentId: { type: String, default: null },
  marketplaceOrderId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
escrowOrderSchema.index({ buyer:1, status:1 });
escrowOrderSchema.index({ seller:1, status:1 });
module.exports = mongoose.model('EscrowOrder', escrowOrderSchema);
