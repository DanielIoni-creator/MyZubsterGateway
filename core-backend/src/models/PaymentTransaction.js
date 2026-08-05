const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentTransactionSchema = new Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  feeAmount: {
    type: Number,
    required: true,
    default: 0
  },
  platformFeePercent: {
    type: Number,
    default: 2
  },
  status: {
    type: String,
    enum: [
      'pending',
      'waiting_payment',
      'payment_detected',
      'confirmed',
      'work_in_progress',
      'work_completed',
      'released',
      'refunded',
      'disputed',
      'failed'
    ],
    default: 'pending'
  },
  clientAddress: {
    type: String,
    required: true
  },
  professionalAddress: {
    type: String
  },
  platformFeeWalletAddress: {
    type: String,
    required: true
  },
  paymentTxId: {
    type: String
  },
  releaseTxId: {
    type: String
  },
  feeTxId: {
    type: String
  },
  refundTxId: {
    type: String
  },
  amountReceived: {
    type: Number,
    default: 0
  },
  confirmations: {
    type: Number,
    default: 0
  },
  confirmedAt: {
    type: Date
  },
  releasedAt: {
    type: Date
  },
  releaseRequested: {
    type: Boolean,
    default: false
  },
  releaseConfirmedByClient: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Calcola la fee al salvataggio
paymentTransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.feeAmount = (this.amount * this.platformFeePercent) / 100;
  }
  next();
});

// Metodi
paymentTransactionSchema.methods.getNetAmount = function() {
  return this.amount - this.feeAmount;
};

paymentTransactionSchema.methods.isReadyForRelease = function() {
  return this.status === 'work_completed' && this.releaseConfirmedByClient;
};

paymentTransactionSchema.methods.canClientRelease = function() {
  return this.status === 'work_completed' && !this.releaseConfirmedByClient;
};

module.exports = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', paymentTransactionSchema);