const mongoose = require('mongoose');

const baseLunareSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Lunar Base'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Lunar Base v1.0'
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
  
  // Posizione
  posizione: {
    regione: {
      type: String,
      enum: ['Mare Tranquillitatis', 'Mare Imbrium', 'Mare Serenitatis', 
             'Mare Fecunditatis', 'Mare Nubium', 'Mare Frigoris'],
      default: 'Mare Tranquillitatis'
    },
    lat: { type: Number, default: 0.8 },
    lng: { type: Number, default: 23.4 },
    altitudine: { type: Number, default: 0 }
  },
  
  // Moduli
  moduli: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['abitativo', 'scientifico', 'energetico', 'agricolo', 'docks', 'commerciale', 'medico']
    },
    stato: {
      type: String,
      enum: ['costruzione', 'attivo', 'manutenzione', 'danneggiato'],
      default: 'costruzione'
    },
    capacita: {
      persone: Number,
      area: Number,
      energia: Number
    },
    superficie: Number,
    costruito: { type: Date, default: Date.now },
    ultimaManutenzione: Date,
    costoCostruzione: Number,
    costoManutenzione: Number
  }],
  
  // Specifiche
  specifiche: {
    superficieTotale: { type: Number, default: 100 },
    moduliTotali: { type: Number, default: 5 },
    capacitaMassima: { type: Number, default: 10 },
    energiaDisponibile: { type: Number, default: 50 },
    ossigenoDisponibile: { type: Number, default: 1000 },
    acquaDisponibile: { type: Number, default: 5000 }
  },
  
  // Sistemi
  sistemi: {
    supportoVitale: {
      tipo: { type: String, default: 'Biologico' },
      capacita: { type: Number, default: 10 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    },
    energia: {
      tipo: { type: String, default: 'Solare + Nucleare' },
      capacita: { type: Number, default: 100 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    },
    comunicazione: {
      tipo: { type: String, default: 'Laser + Radio' },
      portata: { type: Number, default: 500000 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    }
  },
  
  // Equipaggio
  equipaggio: [{
    nome: String,
    ruolo: {
      type: String,
      enum: ['comandante', 'scienziato', 'ingegnere', 'medico', 'tecnico', 'astronauta']
    },
    specializzazione: String,
    dataArrivo: Date,
    dataPartenza: Date,
    contratto: {
      tipo: { type: String, enum: ['permanente', 'temporaneo', 'missione'] },
      scadenza: Date,
      stipendio: Number,
      valuta: String
    }
  }],
  
  // Risorse
  risorse: {
    energia: {
      totale: { type: Number, default: 1000 },
      consumata: { type: Number, default: 0 },
      prodotta: { type: Number, default: 100 },
      riserva: { type: Number, default: 500 }
    },
    acqua: {
      totale: { type: Number, default: 5000 },
      consumata: { type: Number, default: 0 },
      riciclata: { type: Number, default: 0 },
      riserva: { type: Number, default: 2000 }
    },
    cibo: {
      totale: { type: Number, default: 2000 },
      consumato: { type: Number, default: 0 },
      prodotto: { type: Number, default: 100 },
      riserva: { type: Number, default: 500 }
    },
    ossigeno: {
      totale: { type: Number, default: 10000 },
      consumato: { type: Number, default: 0 },
      prodotto: { type: Number, default: 200 },
      riserva: { type: Number, default: 1000 }
    }
  },
  
  // Missioni
  missioni: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['esplorazione', 'ricerca', 'manutenzione', 'costruzione', 'emergenza']
    },
    dataInizio: Date,
    dataFine: Date,
    obiettivo: String,
    risultati: String,
    status: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'fallita']
    },
    equipaggioCoinvolto: [String],
    ricompensa: Number
  }],
  
  // Statistiche
  statistiche: {
    missioniTotali: { type: Number, default: 0 },
    missioniCompletate: { type: Number, default: 0 },
    oreOperative: { type: Number, default: 0 },
    personeOspitate: { type: Number, default: 0 },
    risorseProdotte: { type: Number, default: 0 },
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
    enum: ['costruzione', 'operativa', 'manutenzione', 'emergenza', 'abbandonata'],
    default: 'costruzione'
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

module.exports = mongoose.model('BaseLunare', baseLunareSchema);
