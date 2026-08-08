const mongoose = require('mongoose');

const energiaMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Martian Energy System'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Energy Mars v1.0'
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
      capacita: { type: Number, default: 200 },
      produzione: { type: Number, default: 0 },
      pannelli: { type: Number, default: 100 },
      efficienza: { type: Number, default: 0.75 },
      superficie: { type: Number, default: 200 }
    },
    nucleare: {
      attivo: { type: Boolean, default: true },
      capacita: { type: Number, default: 100 },
      produzione: { type: Number, default: 0 },
      combustibile: { type: Number, default: 200 },
      autonomia: { type: Number, default: 500 }
    },
    eolico: {
      attivo: { type: Boolean, default: true },
      capacita: { type: Number, default: 50 },
      produzione: { type: Number, default: 0 },
      turbine: { type: Number, default: 20 },
      efficienza: { type: Number, default: 0.6 }
    }
  },
  
  // Accumulo
  accumulo: {
    batterie: {
      capacita: { type: Number, default: 1000 },
      carica: { type: Number, default: 200 },
      efficienza: { type: Number, default: 0.92 },
      tipo: { type: String, default: 'Li-Ion' },
      cicli: { type: Number, default: 0 }
    },
    idrogeno: {
      capacita: { type: Number, default: 200 },
      stoccaggio: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.75 }
    },
    termico: {
      capacita: { type: Number, default: 100 },
      energia: { type: Number, default: 0 },
      efficienza: { type: Number, default: 0.8 }
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

module.exports = mongoose.model('EnergiaMarte', energiaMarteSchema);
