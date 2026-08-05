const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  escrowId: {
    type: String
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['MYZ', 'XMR', 'credit'],
    default: 'XMR'
  },
  type: {
    type: String,
    enum: ['pagamento', 'credito', 'rimborso', 'fee', 'deposito', 'rilascio'],
    default: 'pagamento'
  },
  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentAddress: {
    type: String
  },
  recipientAddress: {
    type: String
  },
  webhookUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'failed', 'refund_pending', 'refunded', 'in_escrow', 'released', 'disputed'],
    default: 'pending'
  },
  confirmedAt: {
    type: Date
  },
  transactionHash: {
    type: String
  },
  confirmations: {
    type: Number,
    default: 0
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationSource: {
    type: String,
    enum: ['monitor', 'admin', 'webhook']
  },
  refundRequestedAt: {
    type: Date
  },
  refundRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundAddress: {
    type: String
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundTxid: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundError: {
    type: String
  },
  refundFailedAt: {
    type: Date
  },
  disputeReason: {
    type: String
  },
  disputeOpenedAt: {
    type: Date
  },
  disputeResolvedAt: {
    type: Date
  },
  clientId: {
    type: String
  },
  robotId: {
    type: String
  },
  note: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

TransactionSchema.index({ fromUser: 1, toUser: 1 });
TransactionSchema.index({ order: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ paymentId: 1 });
TransactionSchema.index({ transactionHash: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ fromUser: 1, createdAt: -1 });
TransactionSchema.index({ toUser: 1, createdAt: -1 });
TransactionSchema.index({ amount: 1 });
TransactionSchema.index({ escrowId: 1 });
TransactionSchema.index({ paymentAddress: 1 });
TransactionSchema.index({ currency: 1 });
TransactionSchema.index({ clientId: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
