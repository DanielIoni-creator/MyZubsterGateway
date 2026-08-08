const mongoose = require('mongoose');

const energiaLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar Energy System'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Energy v1.0'
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
  
  // Fonti di energia
  fonti: {
    solare: {
      attivo: { type: Boolean, default: true },
      capacita: { type: Number, default: 100 }, // kW
      produzione: { type: Number, default: 0 },
      pannelli: { type: Number, default: 50 },
      efficienza: { type: Number, default: 0.85 }
    },
    nucleare: {
      attivo: { type: Boolean, default: false },
      capacita: { type: Number, default: 50 },
      produzione: { type: Number, default: 0 },
      combustibile: { type: Number, default: 100 },
      autonomia: { type: Number, default: 365 }
    },
    termico: {
      attivo: { type: Boolean, default: false },
      capacita: { type: Number, default: 20 },
      produzione: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.6 }
    }
  },
  
  // Accumulo
  accumulo: {
    batterie: {
      capacita: { type: Number, default: 500 }, // kWh
      carica: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.9 },
      tipo: { type: String, default: 'Li-Ion' },
      cicli: { type: Number, default: 0 }
    },
    idrogeno: {
      capacita: { type: Number, default: 100 }, // kg
      stoccaggio: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.7 }
    },
    volano: {
      capacita: { type: Number, default: 50 },
      energia: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.95 }
    }
  },
  
  // Distribuzione
  distribuzione: {
    microgrid: {
      attivo: { type: Boolean, default: true },
      tensione: { type: Number, default: 230 },
      frequenza: { type: Number, default: 50 },
      perdite: { type: Number, default: 0.05 }
    },
    convertitori: [{
      nome: String,
      tipo: String,
      potenza: Number,
      efficienza: Number,
      stato: {
        type: String,
        enum: ['attivo', 'manutenzione', 'offline'],
        default: 'attivo'
      }
    }],
    utenti: [{
      nome: String,
      consumo: Number,
      priorita: {
        type: String,
        enum: ['critica', 'alta', 'media', 'bassa'],
        default: 'media'
      }
    }]
  },
  
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
    energiaProdotta: { type: Number, default: 0 },
    energiaConsumata: { type: Number, default: 0 },
    energiaAccumulata: { type: Number, default: 0 },
    piccoProduzione: { type: Number, default: 0 },
    autonomia: { type: Number, default: 0 },
    efficienzaMedia: { type: Number, default: 0 },
    oreOperative: { type: Number, default: 0 },
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
    enum: ['attivo', 'produzione', 'manutenzione', 'emergenza'],
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

module.exports = mongoose.model('EnergiaLunare', energiaLunareSchema);
