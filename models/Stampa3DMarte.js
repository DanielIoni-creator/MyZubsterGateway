const mongoose = require('mongoose');

const stampa3DMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Martian 3D Printer'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: '3D Printer Mars v1.0'
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
    volumeStampabile: { type: Number, default: 500 },
    altezzaMassima: { type: Number, default: 2000 },
    larghezzaMassima: { type: Number, default: 2000 },
    profonditaMassima: { type: Number, default: 2000 },
    precisione: { type: Number, default: 0.05 },
    velocitaStampaggio: { type: Number, default: 150 },
    temperaturaEstrusione: { type: Number, default: 250 },
    materialiCompatibili: [String],
    tecnologia: {
      type: String,
      enum: ['FDM', 'SLA', 'SLS', 'Multi-materiale'],
      default: 'FDM'
    }
  },
  
  // Materiali disponibili
  materiali: {
    regolite: {
      disponibile: { type: Number, default: 2000 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 8 }
    },
    polimeri: {
      disponibile: { type: Number, default: 800 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 40 }
    },
    metalli: {
      disponibile: { type: Number, default: 300 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 80 }
    },
    biomateriali: {
      disponibile: { type: Number, default: 100 },
      consumo: { type: Number, default: 0 },
      costo: { type: Number, default: 120 }
    }
  },
  
  // Progetti stampati
  progetti: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['struttura', 'componente', 'utensile', 'modulo', 'decorativo', 'biologico']
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
      metalli: Number,
      biomateriali: Number
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
    valutazione: Number,
    utilizzo: {
      type: String,
      enum: ['base', 'struttura', 'strumento', 'ricambio']
    }
  }],
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Elysium Planitia', 'Valles Marineris', 'Olympus Mons', 
             'Hellas Planitia', 'Argyre Planitia', 'Tharsis'],
      default: 'Elysium Planitia'
    },
    baseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseMarte'
    }
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
  
  stato: {
    type: String,
    enum: ['attivo', 'in_stampa', 'manutenzione', 'danneggiato', 'inattivo'],
    default: 'attivo'
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

module.exports = mongoose.model('Stampa3DMarte', stampa3DMarteSchema);
