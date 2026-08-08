const mongoose = require('mongoose');

const autoSchema = new mongoose.Schema({
  targa: { type: String, required: true, unique: true, uppercase: true },
  modello: { type: String, required: true },
  marca: { type: String, required: true },
  anno: Number,
  proprietarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: { type: String, required: true },
  serbatoioCapacita: { type: Number, default: 50 },
  carburanteAttuale: { type: Number, default: 0 },
  carburanteTipo: { type: String, enum: ['benzina', 'diesel', 'elettrico', 'ibrido'], default: 'benzina' },
  blockchain: { type: String, enum: ['MYZ', 'XMR', 'BOTH'], default: 'MYZ' },
  preferenze: {
    rifornimentoAutomatico: { type: Boolean, default: false },
    sogliaMinima: { type: Number, default: 10 },
    stazionePreferita: { type: String }
  },
  storicoRifornimenti: [{
    data: { type: Date, default: Date.now },
    quantita: Number,
    costo: Number,
    valuta: String,
    stazione: String,
    transactionId: String,
    blockchain: String,
    automatico: { type: Boolean, default: false }
  }],
  stato: { type: String, enum: ['parcheggiata', 'in_movimento', 'rifornimento', 'manutenzione'], default: 'parcheggiata' },
  posizione: { lat: Number, lng: Number, aggiornato: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Auto', autoSchema);
