const mongoose = require('mongoose');

const cittaSuMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Martian City'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Urban Mars v1.0'
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
    superficieTotale: { type: Number, default: 50000 },
    densita: { type: Number, default: 15 },
    strade: { type: Number, default: 20 },
    piazze: { type: Number, default: 8 },
    parchi: { type: Number, default: 5 },
    domi: { type: Number, default: 10 }
  },
  
  // Zone
  zone: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['residenziale', 'commerciale', 'industriale', 'scientifico', 'verde', 'misto', 'culturale']
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
    },
    priorita: {
      type: String,
      enum: ['bassa', 'media', 'alta', 'critica'],
      default: 'media'
    }
  }],
  
  // Edifici
  edifici: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['residenziale', 'commerciale', 'uffici', 'scuola', 'ospedale', 
             'centro_ricerche', 'centro_commerciale', 'teatro', 'museo', 'palazzetto_sport']
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
    costoManutenzione: Number,
    domo: { type: Boolean, default: true }
  }],
  
  // Infrastrutture
  infrastrutture: {
    trasporti: {
      strade: { type: Number, default: 0 },
      tunnel: { type: Number, default: 0 },
      stazioni: { type: Number, default: 0 },
      veicoli: { type: Number, default: 0 },
      aeroporto: { type: Boolean, default: false }
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
      fibra: { type: Number, default: 0 },
      satellite: { type: Boolean, default: false }
    }
  },
  
  // Servizi
  servizi: {
    ospedale: {
      presente: { type: Boolean, default: false },
      postiLetto: { type: Number, default: 0 },
      medici: { type: Number, default: 0 },
      specialita: [String]
    },
    scuole: {
      presenti: { type: Boolean, default: false },
      numero: { type: Number, default: 0 },
      studenti: { type: Number, default: 0 },
      livelli: [String]
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
      biblioteche: { type: Number, default: 0 },
      cinema: { type: Number, default: 0 }
    },
    sport: {
      presente: { type: Boolean, default: false },
      palestre: { type: Number, default: 0 },
      campi: { type: Number, default: 0 },
      piscine: { type: Number, default: 0 }
    }
  },
  
  // Popolazione
  popolazione: {
    totale: { type: Number, default: 0 },
    famiglie: { type: Number, default: 0 },
    etaMedia: { type: Number, default: 0 },
    crescita: { type: Number, default: 0 },
    densita: { type: Number, default: 0 },
    occupazione: {
      agricoltura: { type: Number, default: 0 },
      industria: { type: Number, default: 0 },
      servizi: { type: Number, default: 0 },
      ricerca: { type: Number, default: 0 }
    }
  },
  
  // Sostenibilità
  sostenibilita: {
    energiaRinnovabile: { type: Number, default: 0 },
    riciclo: { type: Number, default: 0 },
    agricolturaUrbana: { type: Number, default: 0 },
    improntaCarbonio: { type: Number, default: 0 },
    qualitaAria: { type: Number, default: 0 },
    indiceSostenibilita: { type: Number, default: 0 }
  },
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Elysium Planitia', 'Valles Marineris', 'Olympus Mons', 
             'Hellas Planitia', 'Argyre Planitia', 'Tharsis'],
      default: 'Elysium Planitia'
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

module.exports = mongoose.model('CittaSuMarte', cittaSuMarteSchema);
