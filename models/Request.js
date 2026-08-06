const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'Manutenzione',
      'Bellezza',
      'Informatica',
      'Giardinaggio',
      'Pulizie',
      'Insegnamento',
      'Arte',
      'Salute',
      'Altro'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  zone: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    default: 0
  },
  urgency: {
    type: String,
    enum: ['bassa', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  desiredDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['aperta', 'in_corso', 'completata', 'cancellata'],
    default: 'aperta'
  },
  selectedOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  }
}, {
  timestamps: true
});

RequestSchema.index({ user: 1 });
RequestSchema.index({ category: 1 });
RequestSchema.index({ zone: 1 });
RequestSchema.index({ status: 1 });
RequestSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Request', RequestSchema);