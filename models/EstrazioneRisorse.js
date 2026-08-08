const mongoose = require('mongoose');

const estrazioneRisorseSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Resource Extractor'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Extractor v1.0'
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
    profonditaMassima: { type: Number, default: 100 }, // metri
    diametroPerforazione: { type: Number, default: 0.5 }, // metri
    capacitaEstrazione: { type: Number, default: 1000 }, // kg/giorno
    efficienza: { type: Number, default: 0.85 },
    consumoEnergetico: { type: Number, default: 50 }, // kWh
    autonomia: { type: Number, default: 365 } // giorni
  },
  
  // Risorse estraibili
  risorse: {
    regolite: {
      estratto: { type: Number, default: 0 },
      capacita: { type: Number, default: 5000 },
      prezzo: { type: Number, default: 10 }
    },
    acqua: {
      estratto: { type: Number, default: 0 },
      capacita: { type: Number, default: 1000 },
      prezzo: { type: Number, default: 50 }
    },
    elio3: {
      estratto: { type: Number, default: 0 },
      capacita: { type: Number, default: 100 },
      prezzo: { type: Number, default: 500 }
    },
    metalli: {
      estratto: { type: Number, default: 0 },
      capacita: { type: Number, default: 500 },
      prezzo: { type: Number, default: 100 }
    }
  },
  
  // Operazioni
  operazioni: [{
    tipo: {
      type: String,
      enum: ['perforazione', 'estrazione', 'trasporto', 'stoccaggio']
    },
    risorsa: {
      type: String,
      enum: ['regolite', 'acqua', 'elio3', 'metalli']
    },
    quantita: Number,
    durata: Number,
    dataInizio: Date,
    dataFine: Date,
    stato: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'fallita']
    },
    costo: Number,
    ricavo: Number,
    valutazione: Number
  }],
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris', 'Polo Sud'],
      default: 'Mare Tranquillitatis'
    },
    coordinate: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      profondita: { type: Number, default: 0 }
    },
    baseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseLunare'
    }
  },
  
  // Stato
  stato: {
    type: String,
    enum: ['attivo', 'in_perforazione', 'in_estrazione', 'manutenzione', 'danneggiato'],
    default: 'attivo'
  },
  
  // Statistiche
  statistiche: {
    operazioniTotali: { type: Number, default: 0 },
    operazioniCompletate: { type: Number, default: 0 },
    risorseEstratte: { type: Number, default: 0 },
    oreOperative: { type: Number, default: 0 },
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

module.exports = mongoose.model('EstrazioneRisorse', estrazioneRisorseSchema);
