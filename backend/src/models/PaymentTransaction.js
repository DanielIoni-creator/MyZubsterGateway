const mongoose = require('mongoose');

const { Schema } = mongoose;

const paymentTransactionSchema = new Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  feeAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  platformFeeWalletAddress: {
    type: String,
    default: null
  },
  platformFeeStatus: {
    type: String,
    enum: ['pending', 'sent', 'skipped', 'failed'],
    default: 'pending',
    index: true
  },
  platformFeeTxId: {
    type: String,
    default: null
  },
  platformFeeError: {
    type: String,
    default: null
  },
  platformFeeSentAt: {
    type: Date,
    default: null
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  status: {
    type: String,
    enum: ['in_attesa', 'confermato', 'fallito', 'pending', 'detected', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  moneroAddress: {
    type: String,
    required: true
  },
  amountAtomic: {
    type: String,
    required: true
  },
  paidAtomic: {
    type: String,
    default: '0'
  },
  paidXmr: {
    type: String,
    default: '0'
  },
  requiredConfirmations: {
    type: Number,
    default: 0,
    min: 0
  },
  subaddressIndex: {
    type: Number,
    default: null
  },
  externalId: {
    type: String,
    default: null,
    index: true
  },
  moneroProvider: {
    type: String,
    enum: ['wallet-rpc', 'moneropay'],
    default: 'wallet-rpc'
  },
  txIds: {
    type: [String],
    default: []
  },
  fcmToken: {
    type: String,
    default: null
  },
  notificationSentAt: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  confirmations: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date,
    default: null
  }
}, {
  versionKey: false
});

paymentTransactionSchema.index({ sellerId: 1, createdAt: -1 });
paymentTransactionSchema.index({ buyerId: 1, createdAt: -1 });
paymentTransactionSchema.index({ moneroAddress: 1 }, { unique: true });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', paymentTransactionSchema);
