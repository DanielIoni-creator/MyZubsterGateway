const mongoose = require('mongoose');

const estrazioneAcquaMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Martian Water Extraction'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'WaterExtraction v1.0'
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
  
  // Siti di estrazione
  siti: [{
    nome: String,
    posizione: {
      lat: Number,
      lng: Number,
      regione: {
        type: String,
        enum: ['Elysium Planitia', 'Valles Marineris', 'Olympus Mons', 
               'Hellas Planitia', 'Argyre Planitia', 'Tharsis', 'Polo Nord', 'Polo Sud'],
        default: 'Polo Sud'
      },
      profondita: Number,
      qualita: Number // 0-100
    },
    riserve: {
      stimate: Number, // litri
      estratte: Number,
      rimanenti: Number
    },
    stato: {
      type: String,
      enum: ['esplorato', 'attivo', 'esaurito', 'manutenzione'],
      default: 'esplorato'
    }
  }],
  
  // Sistemi di estrazione
  sistemi: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['perforazione', 'termico', 'pompa']
    },
    capacita: Number, // litri/ora
    efficienza: Number,
    consumoEnergetico: Number,
    profonditaMassima: Number,
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'danneggiato'],
      default: 'attivo'
    },
    costo: Number,
    costoManutenzione: Number
  }],
  
  // Produzione
  produzione: {
    totale: { type: Number, default: 0 },
    giornaliera: { type: Number, default: 0 },
    settimanale: { type: Number, default: 0 },
    mensile: { type: Number, default: 0 },
    annuale: { type: Number, default: 0 }
  },
  
  // Qualità acqua
  qualita: {
    ph: { type: Number, default: 7.0 },
    durezza: { type: Number, default: 50 },
    salinita: { type: Number, default: 0.5 },
    batteri: { type: Number, default: 0 },
    minerali: {
      calcio: Number,
      magnesio: Number,
      sodio: Number,
      potassio: Number
    },
    purificata: { type: Boolean, default: false }
  },
  
  // Purificazione
  purificazione: {
    attiva: { type: Boolean, default: true },
    sistemi: [{
      nome: String,
      tipo: {
        type: String,
        enum: ['filtro', 'osmosi', 'uv', 'distillazione']
      },
      capacita: Number,
      efficienza: Number,
      stato: {
        type: String,
        enum: ['attivo', 'manutenzione', 'danneggiato'],
        default: 'attivo'
      }
    }],
    consumi: {
      energia: Number,
      filtri: Number
    }
  },
  
  // Stoccaggio
  stoccaggio: {
    serbatoi: [{
      nome: String,
      capacita: Number,
      riempito: Number,
      tipo: {
        type: String,
        enum: ['acqua_potabile', 'acqua_tecnica', 'acqua_irrigazione']
      },
      stato: {
        type: String,
        enum: ['attivo', 'manutenzione', 'danneggiato'],
        default: 'attivo'
      }
    }],
    totale: { type: Number, default: 0 },
    utilizzo: {
      base: { type: Number, default: 0 },
      agricoltura: { type: Number, default: 0 },
      industria: { type: Number, default: 0 },
      ricerca: { type: Number, default: 0 }
    }
  },
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Elysium Planitia', 'Valles Marineris', 'Olympus Mons', 
             'Hellas Planitia', 'Argyre Planitia', 'Tharsis', 'Polo Nord', 'Polo Sud'],
      default: 'Polo Sud'
    },
    baseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseMarte'
    }
  },
  
  // Statistiche
  statistiche: {
    acquaEstratta: { type: Number, default: 0 },
    acquaPurificata: { type: Number, default: 0 },
    acquaDistribuita: { type: Number, default: 0 },
    oreOperative: { type: Number, default: 0 },
    efficienzaMedia: { type: Number, default: 0 },
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
    enum: ['esplorazione', 'attivo', 'produzione', 'manutenzione', 'emergenza'],
    default: 'esplorazione'
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

module.exports = mongoose.model('EstrazioneAcquaMarte', estrazioneAcquaMarteSchema);
