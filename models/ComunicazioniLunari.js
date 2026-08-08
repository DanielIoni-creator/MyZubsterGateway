const mongoose = require('mongoose');

const comunicazioniLunariSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar Comms System'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Comms v1.0'
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
  
  // Satellite
  satellite: {
    nome: { type: String, default: 'Lunar Relay-1' },
    codice: { type: String, default: 'LR-001' },
    orbita: {
      tipo: { type: String, enum: ['bassa', 'media', 'alta', 'geostazionaria'], default: 'alta' },
      altitudine: { type: Number, default: 384400 },
      inclinazione: { type: Number, default: 0 }
    },
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
      default: 'attivo'
    },
    potenza: { type: Number, default: 1000 },
    batteria: { type: Number, default: 100 },
    pannelliSolare: { type: Number, default: 500 }
  },
  
  // Stazione Terra
  stazioneTerra: {
    nome: { type: String, default: 'MyZubster Ground Station' },
    posizione: {
      lat: { type: Number, default: 44.067 },
      lng: { type: Number, default: 12.569 }
    },
    antenna: {
      tipo: { type: String, default: 'Parabolica' },
      diametro: { type: Number, default: 10 },
      guadagno: { type: Number, default: 50 },
      potenza: { type: Number, default: 1000 }
    },
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'emergenza', 'offline'],
      default: 'attivo'
    }
  },
  
  // Canali comunicazione
  canali: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['laser', 'radio', 'quantum', 'ottico']
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
      enum: ['comando', 'dati', 'video', 'audio', 'emergenza']
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
    criptato: { type: Boolean, default: true }
  }],
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris', 'Polo Sud'],
      default: 'Mare Tranquillitatis'
    },
    baseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseLunare'
    }
  },
  
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

module.exports = mongoose.model('ComunicazioniLunari', comunicazioniLunariSchema);
