const mongoose = require('mongoose');

const comunicazioneMarteTerraSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Mars-Earth Comms System'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Mars Comms v1.0'
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
  
  // Satelliti
  satelliti: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['orbita_marte', 'relay_solare', 'deep_space']
    },
    orbita: {
      tipo: { type: String, enum: ['bassa', 'media', 'alta', 'sincrona'] },
      altitudine: Number,
      inclinazione: Number
    },
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
      default: 'attivo'
    },
    potenza: Number,
    batteria: Number,
    pannelliSolare: Number,
    portata: Number,
    latenza: Number
  }],
  
  // Stazioni
  stazioni: {
    marte: {
      nome: { type: String, default: 'Mars Base Station' },
      posizione: {
        regione: { type: String, default: 'Elysium Planitia' },
        lat: { type: Number, default: 4.5 },
        lng: { type: Number, default: 135.9 }
      },
      antenna: {
        tipo: { type: String, default: 'Parabolica' },
        diametro: { type: Number, default: 15 },
        guadagno: { type: Number, default: 60 },
        potenza: { type: Number, default: 2000 }
      },
      stato: {
        type: String,
        enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
        default: 'attivo'
      }
    },
    terra: {
      nome: { type: String, default: 'Earth Ground Station' },
      posizione: {
        lat: { type: Number, default: 44.067 },
        lng: { type: Number, default: 12.569 }
      },
      antenna: {
        tipo: { type: String, default: 'Parabolica' },
        diametro: { type: Number, default: 25 },
        guadagno: { type: Number, default: 70 },
        potenza: { type: Number, default: 5000 }
      },
      stato: {
        type: String,
        enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
        default: 'attivo'
      }
    }
  },
  
  // Canali
  canali: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['laser', 'radio', 'deep_space']
    },
    frequenza: Number,
    banda: Number,
    portata: Number,
    latenza: Number,
    affidabilita: Number,
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'offline'],
      default: 'attivo'
    },
    criptato: { type: Boolean, default: true },
    protocollo: String
  }],
  
  // Messaggi
  messaggi: [{
    tipo: {
      type: String,
      enum: ['comando', 'dati', 'video', 'audio', 'emergenza', 'scientifico']
    },
    mittente: String,
    destinatario: String,
    contenuto: String,
    dimensione: Number,
    priorita: {
      type: String,
      enum: ['bassa', 'media', 'alta', 'critica'],
      default: 'media'
    },
    dataInvio: Date,
    dataRicezione: Date,
    stato: {
      type: String,
      enum: ['inviato', 'ricevuto', 'letto', 'errore'],
      default: 'inviato'
    },
    transactionId: String,
    criptato: { type: Boolean, default: true },
    latenzaReale: Number
  }],
  
  // Statistiche
  statistiche: {
    messaggiTotali: { type: Number, default: 0 },
    messaggiRicevuti: { type: Number, default: 0 },
    messaggiInviati: { type: Number, default: 0 },
    uptime: { type: Number, default: 0 },
    downtime: { type: Number, default: 0 },
    latenzaMedia: { type: Number, default: 0 },
    affidabilita: { type: Number, default: 0.999 },
    ricaviTotali: { type: Number, default: 0 }
  },
  
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
    enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
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

module.exports = mongoose.model('ComunicazioneMarteTerra', comunicazioneMarteTerraSchema);
