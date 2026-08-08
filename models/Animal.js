const mongoose = require('mongoose');

const AnimalSchema = new mongoose.Schema({
  species: { type: String, required: true },
  place: { type: String, required: true },  // Cambiato da 'location' a 'place'
  description: { type: String },
  registeredBy: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

// Indice per ricerche rapide
AnimalSchema.index({ species: 1 });
AnimalSchema.index({ registeredBy: 1 });
AnimalSchema.index({ registeredAt: -1 });

module.exports = mongoose.model('Animal', AnimalSchema);
