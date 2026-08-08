const mongoose = require('mongoose');

const centroControlloSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  posizione: {
    pianeta: String,
    sistema: String,
    coordinate: { lat: Number, lng: Number }
  },
  
  // Capacità
  capacita: {
    navicelleMassime: { type: Number, default: 10 },
    personale: { type: Number, default: 50 },
    banchine: { type: Number, default: 5 }
  },
  
  // Servizi
  servizi: [{
    type: String,
    enum: ['rifornimento', 'manutenzione', 'equipaggiamento', 'alloggio', 'comunicazioni']
  }],
  
  // Prezzi
  prezzi: {
    atterraggio: { type: Number, default: 100 },
    rifornimento: { type: Number, default: 50 }, // per unità
    manutenzione: { type: Number, default: 200 },
    equipaggiamento: { type: Number, default: 150 }
  },
  
  // Pagamenti accettati
  pagamentiAccettati: {
    type: [String],
    enum: ['MYZ', 'XMR', 'BOTH'],
    default: ['MYZ']
  },
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Stato
  aperto: {
    type: Boolean,
    default: true
  },
  
  // Blockchain
  blockchain: {
    type: String,
    enum: ['MYZ', 'XMR', 'BOTH'],
    default: 'MYZ'
  },
  
  // Statistiche
  statistiche: {
    navicelleServite: { type: Number, default: 0 },
    missioniCoordinate: { type: Number, default: 0 },
    volumeTotale: { type: Number, default: 0 }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CentroControllo', centroControlloSchema);
