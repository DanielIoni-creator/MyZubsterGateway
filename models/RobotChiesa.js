const mongoose = require('mongoose');

const robotChiesaSchema = new mongoose.Schema({
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
      'lettore',      // Legge letture
      'cantore',      // Guida canti
      'predicatore',  // Aiuta omelie
      'accoglienza',  // Accoglie fedeli
      'preghiera',    // Guida preghiere
      'carità',       // Gestisce donazioni
      'comunicazione', // Social media
      'catechista'    // Insegnamento
    ],
    required: true
  },
  
  // Parrocchia
  parrocchiaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parrocchia',
    required: true
  },
  
  // Wallet
  walletAddress: {
    type: String,
    required: true
  },
  
  // Specializzazioni
  specializzazioni: [{
    type: String,
    enum: [
      'liturgia',
      'catechesi',
      'carità',
      'comunicazione',
      'musica',
      'preghiera',
      'accoglienza'
    ]
  }],
  
  // Competenze
  competenze: {
    lingue: [String],
    temi: [String],
    abilita: [String]
  },
  
  // Stato
  stato: {
    type: String,
    enum: ['attivo', 'in_preghiera', 'in_servizio', 'manutenzione', 'in_riposo'],
    default: 'attivo'
  },
  
  // Posizione
  posizione: {
    chiesa: String,
    zona: String,
    coordinate: { lat: Number, lng: Number }
  },
  
  // Orari di servizio
  orariServizio: [{
    giorno: {
      type: String,
      enum: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica']
    },
    inizio: String,
    fine: String,
    servizio: String
  }],
  
  // Servizi svolti
  servizi: [{
    tipo: {
      type: String,
      enum: ['messa', 'confessione', 'catechesi', 'preghiera', 'evento']
    },
    data: Date,
    descrizione: String,
    partecipanti: Number,
    feedback: [{
      valutazione: { type: Number, min: 1, max: 5 },
      commento: String,
      data: Date
    }]
  }],
  
  // Donazioni ricevute
  donazioni: [{
    data: { type: Date, default: Date.now },
    importo: Number,
    valuta: String,
    transactionId: String,
    motivo: String,
    anonimo: { type: Boolean, default: true }
  }],
  
  // Statistiche
  statistiche: {
    serviziTotali: { type: Number, default: 0 },
    fedeliServiti: { type: Number, default: 0 },
    donazioniTotali: { type: Number, default: 0 },
    valutazioneMedia: { type: Number, default: 0 },
    oreServizio: { type: Number, default: 0 }
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
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RobotChiesa', robotChiesaSchema);
