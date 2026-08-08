const mongoose = require('mongoose');

const navicellaSchema = new mongoose.Schema({
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
    enum: ['cargo', 'passeggeri', 'esplorazione', 'colonizzazione', 'militare'],
    required: true
  },
  
  // Proprietario
  proprietarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Specifiche tecniche
  specifiche: {
    capacitaCarico: { type: Number, default: 0 }, // tonnellate
    capacitaPasseggeri: { type: Number, default: 0 },
    autonomia: { type: Number, default: 1000 }, // anni luce
    velocitaMassima: { type: Number, default: 0.1 }, // velocità luce
    scudoTermico: { type: Boolean, default: true },
    sistemiSupportoVita: { type: Boolean, default: true },
    propulsione: {
      type: String,
      enum: ['ionica', 'antimateria', 'curvatura', 'solare'],
      default: 'ionica'
    }
  },
  
  // Stato
  stato: {
    type: String,
    enum: ['in_orbita', 'in_viaggio', 'atterrata', 'manutenzione', 'in_costruzione'],
    default: 'in_costruzione'
  },
  
  // Posizione
  posizione: {
    pianeta: String,
    sistema: String,
    galassia: String,
    coordinate: {
      x: Number,
      y: Number,
      z: Number
    },
    ultimoAggiornamento: Date
  },
  
  // Missioni
  missioni: [{
    nome: String,
    destinazione: String,
    dataPartenza: Date,
    dataArrivoPrevista: Date,
    dataArrivoEffettiva: Date,
    stato: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'fallita', 'cancellata']
    },
    payload: {
      tipo: String,
      quantita: Number,
      descrizione: String
    },
    costo: Number,
    valuta: String,
    transactionId: String,
    equipaggio: [{
      nome: String,
      ruolo: String,
      id: String
    }]
  }],
  
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
    distanzaPercorsa: { type: Number, default: 0 }, // anni luce
    oreVolo: { type: Number, default: 0 },
    ricaviTotali: { type: Number, default: 0 },
    valuta: { type: String, default: 'MYZ' }
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

module.exports = mongoose.model('Navicella', navicellaSchema);
