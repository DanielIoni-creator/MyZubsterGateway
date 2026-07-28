// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    default: null,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Nome prodotto è obbligatorio'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantità è obbligatoria'],
    min: [1, 'Quantità deve essere almeno 1']
  },
  price: {
    type: Number,
    required: [true, 'Prezzo è obbligatorio'],
    min: [0, 'Prezzo non può essere negativo']
  },
  subtotal: {
    type: Number,
    default: function() {
      return this.quantity * this.price;
    }
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      default: function() {
        return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
    },
    userId: {
      type: String,
      required: [true, 'UserId è obbligatorio'],
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Items è obbligatorio'],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Deve esserci almeno un item'
      }
    },
    total: {
      type: Number,
      required: [true, 'Total è obbligatorio'],
      min: [0, 'Total non può essere negativo']
    },
    currency: {
      type: String,
      default: 'XMR',
      enum: ['XMR', 'EUR', 'USD']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentId: {
      type: String,
      default: null,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    },
    paymentDetails: {
      type: Object,
      default: null
    },
    shippingAddress: {
      type: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true }
      },
      default: {}
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indici per query veloci (SENZA DUPLICATI)
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });

// Middleware pre-save per calcolare subtotal
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.subtotal = item.quantity * item.price;
    });
  }
  next();
});

// Metodi statici
orderSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByPaymentId = function(paymentId) {
  return this.findOne({ paymentId });
};

orderSchema.statics.findAll = function(options = {}) {
  return this.find(options.where || {});
};

// Metodi di istanza
orderSchema.methods.isPayable = function() {
  return this.status === 'pending' && this.paymentStatus !== 'confirmed';
};

orderSchema.methods.isCancellable = function() {
  return this.status === 'pending' && this.paymentStatus !== 'confirmed';
};

orderSchema.methods.calculateTotal = function() {
  return this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
};

module.exports = mongoose.model('Order', orderSchema);
