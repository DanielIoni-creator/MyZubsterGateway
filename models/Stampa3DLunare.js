const mongoose = require('mongoose');

const stampa3DLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar 3D Printer'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: '3D Printer v1.0'
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
  
  // Specifiche
  specifiche: {
    volumeStampabile: { type: Number, default: 100 }, // cm³
    altezzaMassima: { type: Number, default: 1000 }, // cm
    larghezzaMassima: { type: Number, default: 1000 },
    profonditaMassima: { type: Number, default: 1000 },
    precisione: { type: Number, default: 0.1 }, // mm
    velocitaStampaggio: { type: Number, default: 100 }, // mm/s
    temperaturaEstrusione: { type: Number, default: 200 }, // °C
    materialiCompatibili: [String]
  },
  
  // Materiali
  materiali: {
    regolite: {
      disponibile: { type: Number, default: 1000 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 10 }
    },
    polimeri: {
      disponibile: { type: Number, default: 500 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 50 }
    },
    leganti: {
      disponibile: { type: Number, default: 200 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 30 }
    }
  },
  
  // Progetti stampati
  progetti: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['struttura', 'componente', 'utensile', 'modulo', 'decorativo']
    },
    descrizione: String,
    dimensioni: {
      altezza: Number,
      larghezza: Number,
      profondita: Number
    },
    materialeUsato: {
      regolite: Number,
      polimeri: Number,
      leganti: Number
    },
    tempoStampaggio: Number,
    dataInizio: Date,
    dataFine: Date,
    stato: {
      type: String,
      enum: ['pianificato', 'in_corso', 'completato', 'fallito']
    },
    fileStl: String,
    fileGcode: String,
    immagini: [String],
    valutazione: Number
  }],
  
  // Stato
  stato: {
    type: String,
    enum: ['attivo', 'in_stampa', 'manutenzione', 'danneggiato', 'inattivo'],
    default: 'attivo'
  },
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris'],
      default: 'Mare Tranquillitatis'
    },
    baseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseLunare'
    },
    coordinate: { lat: Number, lng: Number }
  },
  
  // Statistiche
  statistiche: {
    progettiTotali: { type: Number, default: 0 },
    progettiCompletati: { type: Number, default: 0 },
    materialeUtilizzato: { type: Number, default: 0 },
    oreStampaggio: { type: Number, default: 0 },
    ricaviTotali: { type: Number, default: 0 },
    valutazioneMedia: { type: Number, default: 0 }
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

module.exports = mongoose.model('Stampa3DLunare', stampa3DLunareSchema);
