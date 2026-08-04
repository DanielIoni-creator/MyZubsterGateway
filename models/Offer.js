const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
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
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
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
    ]
  },
  status: {
    type: String,
    enum: ['attiva', 'inattiva', 'completata'],
    default: 'attiva'
  },
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5] // lunedì-venerdì
  },
  timeSlot: {
    type: String,
    default: 'tutto il giorno'
  }
}, {
  timestamps: true
});

// Indici per ricerca
OfferSchema.index({ user: 1 });
OfferSchema.index({ skill: 1 });
OfferSchema.index({ category: 1 });
OfferSchema.index({ status: 1 });

module.exports = mongoose.model('Offer', OfferSchema);
