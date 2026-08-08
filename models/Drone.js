const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    required: true
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  tipo: {
    type: String,
    enum: [
      'sorveglianza',
      'attacco',
      'ricognizione',
      'logistica',
      'kamikaze',
      'intercettazione'
    ],
    required: true
  },
  
  // Unità
  unitaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UnitaMilitare',
    required: true
  },
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Specifiche tecniche
  specifiche: {
    peso: { type: Number, default: 0 },
    velocita: { type: Number, default: 0 },
    autonomia: { type: Number, default: 0 },
    altitudine: { type: Number, default: 0 },
    portata: { type: Number, default: 0 },
    carico: { type: Number, default: 0 },
    sensori: [String],
    armamento: [{
      nome: String,
      tipo: String,
      capacita: Number
    }]
  },
  
  // Sistema d'arma
  armamento: {
    primario: {
      nome: String,
      tipo: String,
      munizioni: Number,
      portata: Number
    },
    secondario: {
      nome: String,
      tipo: String,
      munizioni: Number,
      portata: Number
    }
  },
  
  // Stato - CORRETTO
  stato: {
    type: String,
    enum: ['attivo', 'in_volo', 'danneggiato', 'manutenzione', 'distrutto'],
    default: 'attivo'
  },
  
  // Posizione
  posizione: {
    lat: Number,
    lng: Number,
    altitudine: Number,
    rotta: Number,
    velocita: Number,
    ultimoAggiornamento: Date
  },
  
  // Missioni
  missioni: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['sorveglianza', 'attacco', 'ricognizione', 'trasporto', 'kamikaze']
    },
    dataInizio: Date,
    dataFine: Date,
    obiettivo: String,
    status: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'fallita']
    },
    rapporto: String,
    perdite: Number,
    danni: Number
  }],
  
  // Intelligenza
  intelligence: {
    livello: { type: Number, min: 1, max: 10, default: 5 },
    addestramento: [String],
    specializzazioni: [String],
    tattiche: [String]
  },
  
  // Blockchain
  blockchain: {
    type: String,
    enum: ['MYZ', 'XMR', 'BOTH'],
    default: 'MYZ'
  },
  
  // NFT
  nft: {
    tokenId: String,
    contractAddress: String,
    metadata: {
      name: String,
      description: String,
      image: String,
      attributes: [{
        trait_type: String,
        value: String
      }]
    }
  },
  
  // Statistiche
  statistiche: {
    missioniTotali: { type: Number, default: 0 },
    missioniCompletate: { type: Number, default: 0 },
    oreVolo: { type: Number, default: 0 },
    kmPercorsi: { type: Number, default: 0 },
    bersagliNeutralizzati: { type: Number, default: 0 },
    ricaviTotali: { type: Number, default: 0 },
    valutazione: { type: Number, default: 0 }
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

module.exports = mongoose.model('Drone', droneSchema);
