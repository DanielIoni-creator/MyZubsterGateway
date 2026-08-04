const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // chi scrive
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // chi viene recensito
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', default: null }, // opzionale: legato a un token
  isVerified: { type: Boolean, default: false }, // se la recensione è verificata (ordine completato)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', ReviewSchema);
