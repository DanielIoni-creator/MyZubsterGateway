const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['XMR', 'credit'],
    default: 'XMR'
  },
  type: {
    type: String,
    enum: ['pagamento', 'credito', 'rimborso', 'fee'],
    default: 'pagamento'
  },
  paymentId: {
    type: String
  },
  recipientAddress: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'failed', 'refund_pending', 'refunded'],
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
    enum: ['monitor', 'admin']
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

module.exports = mongoose.model('Transaction', TransactionSchema);
