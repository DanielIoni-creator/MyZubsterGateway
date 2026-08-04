const mongoose = require('mongoose');

const SignatureSchema = new mongoose.Schema({
  signer: { type: String, required: true },
  signature: { type: String, required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const MultisigSchema = new mongoose.Schema({
  addresses: { type: [String], default: [] },
  requiredSignatures: { type: Number, default: 0 },
}, { _id: false });

const HistorySchema = new mongoose.Schema({
  state: { type: String, required: true },
  at: { type: Date, default: Date.now },
  note: { type: String, default: '' },
}, { _id: false });

const EscrowOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  marketplaceOrderId: { type: String, default: null },
  buyer: { type: String, required: true, index: true },
  seller: { type: String, required: true, index: true },
  amountXMR: { type: Number, required: true, min: 0 },
  state: {
    type: String,
    enum: ['pending', 'funded', 'completed', 'disputed', 'refunded'],
    default: 'pending',
    index: true,
  },
  multisig: { type: MultisigSchema, default: () => ({ addresses: [], requiredSignatures: 0 }) },
  signatures: { type: [SignatureSchema], default: [] },
  fundingTx: { type: String, default: null },
  releaseTx: { type: String, default: null },
  refundTx: { type: String, default: null },
  aiReview: { type: mongoose.Schema.Types.Mixed, default: null },
  dispute: { type: mongoose.Schema.Types.Mixed, default: null },
  completionProof: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  history: { type: [HistorySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('EscrowOrder', EscrowOrderSchema);
