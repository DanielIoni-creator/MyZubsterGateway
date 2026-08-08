const mongoose = require('mongoose');

const evaLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'EVA IONI - Versione Lunare'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Lunar v1.0'
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
  
  // Specifiche Lunari
  specifiche: {
    peso: { type: Number, default: 250 }, // kg
    altezza: { type: Number, default: 1.8 }, // metri
    larghezza: { type: Number, default: 1.2 },
    velocitaMax: { type: Number, default: 15 }, // km/h
    autonomia: { type: Number, default: 500 }, // km
    energia: { type: Number, default: 100 }, // kWh
    resistenzaTermica: { type: Number, default: -180 }, // °C minimo
    resistenzaRadiazione: { type: Number, default: 50 }, // Gy
    caricoUtile: { type: Number, default: 100 } // kg
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
    termico: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 100 }
    },
    radar: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 500 }
    },
    spettrometro: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 50 }
    },
    camera: {
      presente: { type: Boolean, default: true },
      risoluzione: { type: String, default: '4K' }
    },
    lidar: {
      presente: { type: Boolean, default: true },
      range: { type: Number, default: 200 }
    }
  },
  
  // Braccio robotico
  braccio: {
    presente: { type: Boolean, default: true },
    lunghezza: { type: Number, default: 2.5 },
    articolazioni: { type: Number, default: 6 },
    portata: { type: Number, default: 50 },
    utensili: [String]
  },
  
  // Stato
  stato: {
    type: String,
    enum: ['attivo', 'esplorazione', 'ricarica', 'manutenzione', 'danneggiato'],
    default: 'attivo'
  },
  
  // Posizione sulla Luna
  posizione: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    altitudine: { type: Number, default: 0 },
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris'],
      default: 'Mare Tranquillitatis'
    },
    ultimoAggiornamento: Date
  },
  
  // Missioni completate
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
      enum: ['regolite', 'acqua', 'elio-3', 'metalli', 'minerali']
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

module.exports = mongoose.model('EvaLunare', evaLunareSchema);
