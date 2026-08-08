const mongoose = require('mongoose');

const evaMarzianoSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'EVA IONI - Versione Marziana'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Martian v1.0'
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
  
  // Specifiche Marziane
  specifiche: {
    peso: { type: Number, default: 350 },
    altezza: { type: Number, default: 2.2 },
    larghezza: { type: Number, default: 1.5 },
    velocitaMax: { type: Number, default: 20 },
    autonomia: { type: Number, default: 800 },
    energia: { type: Number, default: 150 },
    resistenzaTermica: { type: Number, default: -120 },
    resistenzaRadiazione: { type: Number, default: 100 },
    resistenzaPolvere: { type: Number, default: 95 },
    caricoUtile: { type: Number, default: 200 }
  },
  
  // Sistema di propulsione
  propulsione: {
    tipo: {
      type: String,
      enum: ['elettrica', 'ibrida', 'nucleare'],
      default: 'elettrica'
    },
    motori: {
      tipo: String,
      potenza: Number,
      numero: Number
    },
    batterie: {
      capacita: Number,
      tipo: String,
      ricarica: String
    }
  },
  
  // Sensori
  sensori: {
    spettrometro: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 100 }
    },
    radar: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 1000 }
    },
    chimico: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 50 }
    },
    camera: {
      presente: { type: Boolean, default: true },
      risoluzione: { type: String, default: '8K' }
    },
    lidar: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 500 }
    },
    meteorologico: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 1000 }
    }
  },
  
  // Braccio robotico
  braccio: {
    presente: { type: Boolean, default: true },
    lunghezza: { type: Number, default: 3.0 },
    articolazioni: { type: Number, default: 7 },
    portata: { type: Number, default: 100 },
    utensili: [String]
  },
  
  // Stato
  stato: {
    type: String,
    enum: ['attivo', 'esplorazione', 'ricarica', 'manutenzione', 'danneggiato'],
    default: 'attivo'
  },
  
  // Posizione su Marte
  posizione: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    altitudine: { type: Number, default: 0 },
    regione: {
      type: String,
      enum: ['Valles Marineris', 'Olympus Mons', 'Elysium Planitia', 
             'Hellas Planitia', 'Argyre Planitia', 'Tharsis'],
      default: 'Elysium Planitia'
    },
    ultimoAggiornamento: Date
  },
  
  // Missioni
  missioni: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['esplorazione', 'campionamento', 'costruzione', 'manutenzione', 'ricerca']
    },
    dataInizio: Date,
    dataFine: Date,
    obiettivo: String,
    risultati: String,
    status: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'fallita']
    },
    ricompensa: Number,
    valutazione: Number
  }],
  
  // Risorse raccolte
  risorse: [{
    tipo: {
      type: String,
      enum: ['regolite', 'acqua', 'metalli', 'minerali', 'CO2']
    },
    quantita: Number,
    unita: String,
    dataRaccolta: Date,
    posizione: String
  }],
  
  // Statistiche
  statistiche: {
    missioniTotali: { type: Number, default: 0 },
    missioniCompletate: { type: Number, default: 0 },
    kmPercorsi: { type: Number, default: 0 },
    risorseRaccolte: { type: Number, default: 0 },
    energiaConsumata: { type: Number, default: 0 },
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

module.exports = mongoose.model('EvaMarziano', evaMarzianoSchema);
