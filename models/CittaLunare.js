const mongoose = require('mongoose');

const cittaLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar City'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Urban v1.0'
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
  
  // Layout urbano
  layout: {
    superficieTotale: { type: Number, default: 10000 }, // m²
    densita: { type: Number, default: 10 }, // persone/m²
    strade: { type: Number, default: 5 }, // km
    piazze: { type: Number, default: 3 },
    parchi: { type: Number, default: 2 }
  },
  
  // Zone
  zone: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['residenziale', 'commerciale', 'industriale', 'scientifico', 'verde', 'misto']
    },
    superficie: Number,
    edifici: Number,
    capacita: Number,
    popolazione: Number,
    densita: Number,
    servizi: [String],
    stato: {
      type: String,
      enum: ['pianificata', 'costruzione', 'attiva', 'espansione'],
      default: 'pianificata'
    }
  }],
  
  // Edifici
  edifici: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['residenziale', 'commerciale', 'uffici', 'scuola', 'ospedale', 'centro_ricerche', 'centro_commerciale']
    },
    altezza: Number,
    piani: Number,
    area: Number,
    capacita: Number,
    energiaConsumo: Number,
    acquaConsumo: Number,
    posizione: {
      zona: String,
      coordinate: { x: Number, y: Number }
    },
    stato: {
      type: String,
      enum: ['pianificato', 'costruzione', 'attivo', 'manutenzione'],
      default: 'pianificato'
    },
    costoCostruzione: Number,
    costoManutenzione: Number
  }],
  
  // Infrastrutture
  infrastrutture: {
    trasporti: {
      strade: { type: Number, default: 0 },
      tunnel: { type: Number, default: 0 },
      stazioni: { type: Number, default: 0 },
      veicoli: { type: Number, default: 0 }
    },
    energia: {
      produzione: { type: Number, default: 0 },
      distribuzione: { type: Number, default: 0 },
      accumulo: { type: Number, default: 0 }
    },
    acqua: {
      produzione: { type: Number, default: 0 },
      distribuzione: { type: Number, default: 0 },
      riciclo: { type: Number, default: 0 }
    },
    comunicazioni: {
      reti: { type: Number, default: 0 },
      antenne: { type: Number, default: 0 },
      fibra: { type: Number, default: 0 }
    }
  },
  
  // Servizi
  servizi: {
    ospedale: {
      presente: { type: Boolean, default: false },
      postiLetto: { type: Number, default: 0 },
      medici: { type: Number, default: 0 }
    },
    scuole: {
      presenti: { type: Boolean, default: false },
      numero: { type: Number, default: 0 },
      studenti: { type: Number, default: 0 }
    },
    mercato: {
      presente: { type: Boolean, default: false },
      negozi: { type: Number, default: 0 },
      prodotti: [String]
    },
    cultura: {
      presente: { type: Boolean, default: false },
      teatri: { type: Number, default: 0 },
      musei: { type: Number, default: 0 },
      biblioteche: { type: Number, default: 0 }
    }
  },
  
  // Popolazione
  popolazione: {
    totale: { type: Number, default: 0 },
    famiglie: { type: Number, default: 0 },
    etaMedia: { type: Number, default: 0 },
    crescita: { type: Number, default: 0 },
    densita: { type: Number, default: 0 }
  },
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris', 'Polo Sud'],
      default: 'Mare Tranquillitatis'
    },
    coordinate: { lat: Number, lng: Number }
  },
  
  // Statistiche
  statistiche: {
    edificiTotali: { type: Number, default: 0 },
    abitantiTotali: { type: Number, default: 0 },
    superficieCostruita: { type: Number, default: 0 },
    verdePubblico: { type: Number, default: 0 },
    indiceQualita: { type: Number, default: 0 },
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
    enum: ['pianificata', 'in_costruzione', 'attiva', 'espansione'],
    default: 'pianificata'
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

module.exports = mongoose.model('CittaLunare', cittaLunareSchema);
