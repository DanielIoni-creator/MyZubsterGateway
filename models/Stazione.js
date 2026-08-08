const mongoose = require('mongoose');

const stazioneSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  indirizzo: { type: String, required: true },
  posizione: { lat: Number, lng: Number },
  prezzi: {
    benzina: { type: Number, default: 1.80 },
    diesel: { type: Number, default: 1.70 },
    elettrico: { type: Number, default: 0.50 }
  },
  pagamentiAccettati: { type: [String], enum: ['MYZ', 'XMR', 'BOTH'], default: ['MYZ'] },
  walletAddress: { type: String, required: true },
  carburanteDisponibile: { benzina: Number, diesel: Number },
  aperto: { type: Boolean, default: true },
  orarioApertura: String,
  orarioChiusura: String,
  blockchain: { type: String, enum: ['MYZ', 'XMR', 'BOTH'], default: 'MYZ' },
  transazioniTotali: { type: Number, default: 0 },
  volumeTotale: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stazione', stazioneSchema);
