const mongoose = require('mongoose');

const unitaMilitareSchema = new mongoose.Schema({
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
    enum: ['esercito', 'marina', 'aeronautica', 'forze_speciali'],
    required: true
  },
  
  // Base
  base: {
    nome: String,
    posizione: { lat: Number, lng: Number },
    regione: String
  },
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Robot e droni
  robotIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RobotMilitare'
  }],
  droneIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drone'
  }],
  
  // Personale
  personale: {
    ufficiali: Number,
    sottufficiali: Number,
    truppa: Number,
    totale: Number
  },
  
  // Equipaggiamento
  equipaggiamento: {
    veicoli: Number,
    armi: Number,
    munizioni: Number,
    carburante: Number
  },
  
  // Statistiche
  statistiche: {
    missioniTotali: { type: Number, default: 0 },
    missioniCompletate: { type: Number, default: 0 },
    robotAttivi: { type: Number, default: 0 },
    droniAttivi: { type: Number, default: 0 },
    ricaviTotali: { type: Number, default: 0 }
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

module.exports = mongoose.model('UnitaMilitare', unitaMilitareSchema);
