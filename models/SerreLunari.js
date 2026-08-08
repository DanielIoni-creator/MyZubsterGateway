const mongoose = require('mongoose');

const serreLunariSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar Greenhouses'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Greenhouse v1.0'
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
  
  // Serre
  serre: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['idroponica', 'aeroponica', 'suolo', 'mista']
    },
    superficie: Number,
    capacita: Number,
    produzione: Number,
    stato: {
      type: String,
      enum: ['costruzione', 'attiva', 'manutenzione', 'danneggiata'],
      default: 'costruzione'
    },
    condizioni: {
      temperatura: Number,
      umidita: Number,
      co2: Number,
      luce: Number,
      ph: Number
    },
    colture: [{
      nome: String,
      tipo: {
        type: String,
        enum: ['vegetale', 'frutta', 'erba', 'fiore', 'cereale']
      },
      quantita: Number,
      dataPiantagione: Date,
      dataRaccolta: Date,
      stato: {
        type: String,
        enum: ['piantato', 'crescita', 'maturo', 'raccolto', 'fallito']
      },
      resa: Number,
      qualita: Number
    }],
    consumo: {
      energia: Number,
      acqua: Number,
      nutrienti: Number
    }
  }],
  
  // Risorse
  risorse: {
    acqua: {
      totale: { type: Number, default: 1000 },
      consumata: { type: Number, default: 0 },
      riciclata: { type: Number, default: 0 },
      disponibile: { type: Number, default: 1000 }
    },
    nutrienti: {
      totale: { type: Number, default: 500 },
      consumati: { type: Number, default: 0 },
      disponibili: { type: Number, default: 500 }
    },
    energia: {
      totale: { type: Number, default: 100 },
      consumata: { type: Number, default: 0 },
      disponibile: { type: Number, default: 100 }
    }
  },
  
  // Produzione
  produzione: {
    vegetali: { type: Number, default: 0 },
    frutta: { type: Number, default: 0 },
    erbe: { type: Number, default: 0 },
    totale: { type: Number, default: 0 }
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
    raccoltiTotali: { type: Number, default: 0 },
    produzioneTotale: { type: Number, default: 0 },
    superficieColtivata: { type: Number, default: 0 },
    efficienzaMedia: { type: Number, default: 0 },
    autosufficienza: { type: Number, default: 0 },
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
    enum: ['costruzione', 'attivo', 'manutenzione', 'emergenza'],
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

module.exports = mongoose.model('SerreLunari', serreLunariSchema);
