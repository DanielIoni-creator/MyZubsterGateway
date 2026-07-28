const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'paid'],
    default: 'pending',
  },
  orderNumber: { type: Number, unique: true, sparse: true },
  // --- Campi Monero ---
  moneroSubaddress: { type: String, default: null },
  moneroAddressIndex: { type: Number, default: null },
  moneroPaymentStatus: {
    type: String,
    enum: ['pending', 'detected', 'paid', 'confirmed', 'expired', 'failed'],
    default: 'pending',
  },
  moneroPaymentTxid: { type: String, default: null },
  moneroPaymentAmount: { type: Number, default: 0 },
  moneroPaymentConfirmations: { type: Number, default: 0 },
  moneroPaymentDetectedAt: { type: Date, default: null },
  moneroPaymentConfirmedAt: { type: Date, default: null },
  moneroPaymentExpiresAt: { type: Date, default: null },
  // --- Fine campi Monero ---
  createdAt: { type: Date, default: Date.now },
});

// Genera orderNumber prima del salvataggio
OrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = count + 1;
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
