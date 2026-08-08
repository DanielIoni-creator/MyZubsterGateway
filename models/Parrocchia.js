const mongoose = require('mongoose');

const parrocchiaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  indirizzo: {
    type: String,
    required: true
  },
  coordinate: {
    lat: Number,
    lng: Number
  },
  
  // Dati parrocchia
  diocesi: String,
  decanato: String,
  parroco: String,
  numeroFedeli: Number,
  
  // Servizi
  servizi: {
    messe: [{
      giorno: String,
      orario: String,
      lingua: String
    }],
    confessioni: [{
      giorno: String,
      orario: String
    }],
    catechesi: [{
      giorno: String,
      orario: String,
      fascia: String
    }]
  },
  
  // Robot associati
  robotIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RobotChiesa'
  }],
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Statistiche
  statistiche: {
    robotAttivi: { type: Number, default: 0 },
    serviziTotali: { type: Number, default: 0 },
    fedeliServiti: { type: Number, default: 0 },
    donazioniTotali: { type: Number, default: 0 }
  },
  
  // Blockchain
  blockchain: {
    type: String,
    enum: ['MYZ', 'XMR', 'BOTH'],
    default: 'MYZ'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Parrocchia', parrocchiaSchema);
