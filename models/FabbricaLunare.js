const mongoose = require('mongoose');

const fabbricaLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar Factory'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Factory v1.0'
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
  
  // Linee di produzione
  lineeProduzione: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['edile', 'meccanico', 'elettronico', 'composito']
    },
    capacita: { type: Number, default: 100 },
    produzione: { type: Number, default: 0 },
    efficienza: { type: Number, default: 0.85 },
    stato: {
      type: String,
      enum: ['attivo', 'manutenzione', 'fermo'],
      default: 'attivo'
    },
    costoOrario: { type: Number, default: 100 },
    energiaConsumo: { type: Number, default: 50 }
  }],
  
  // Prodotti
  prodotti: [{
    nome: String,
    codice: String,
    tipo: {
      type: String,
      enum: ['edile', 'meccanico', 'elettronico', 'composito']
    },
    descrizione: String,
    costoProduzione: { type: Number, default: 100 },
    prezzoVendita: { type: Number, default: 150 },
    tempoProduzione: { type: Number, default: 1 }, // ore
    materiali: {
      regolite: { type: Number, default: 0 },
      acqua: { type: Number, default: 0 },
      metalli: { type: Number, default: 0 },
      polimeri: { type: Number, default: 0 }
    },
    scorta: { type: Number, default: 0 },
    scortaMinima: { type: Number, default: 10 }
  }],
  
  // Ordini di produzione
  ordini: [{
    prodottoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prodotto'
    },
    quantita: Number,
    dataInizio: Date,
    dataFine: Date,
    stato: {
      type: String,
      enum: ['pianificato', 'in_produzione', 'completato', 'cancellato']
    },
    costo: Number,
    ricavo: Number,
    valutazione: Number
  }],
  
  // Magazzino
  magazzino: {
    materiePrime: {
      regolite: { type: Number, default: 1000 },
      acqua: { type: Number, default: 500 },
      metalli: { type: Number, default: 200 },
      polimeri: { type: Number, default: 300 }
    },
    prodottiFiniti: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  
  // Specifiche
  specifiche: {
    superficie: { type: Number, default: 500 },
    capacitaMassima: { type: Number, default: 1000 },
    energiaDisponibile: { type: Number, default: 200 },
    personale: { type: Number, default: 10 }
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
    },
    coordinate: { lat: Number, lng: Number }
  },
  
  // Statistiche
  statistiche: {
    ordiniTotali: { type: Number, default: 0 },
    ordiniCompletati: { type: Number, default: 0 },
    prodottiProdotti: { type: Number, default: 0 },
    oreProduzione: { type: Number, default: 0 },
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
    enum: ['attiva', 'produzione', 'manutenzione', 'ferma'],
    default: 'attiva'
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

module.exports = mongoose.model('FabbricaLunare', fabbricaLunareSchema);
