const mongoose = require('mongoose');

const PlantSchema = new mongoose.Schema({
  species: { type: String, required: true },
  place: { type: String, required: true },  // Cambiato da 'location' a 'place'
  description: { type: String },
  registeredBy: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

// Indice per ricerche rapide
PlantSchema.index({ species: 1 });
PlantSchema.index({ registeredBy: 1 });
PlantSchema.index({ registeredAt: -1 });

module.exports = mongoose.model('Plant', PlantSchema);
