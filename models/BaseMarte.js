const mongoose = require('mongoose');

const baseMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Mars Base'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Mars Base v1.0'
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
  
  // Posizione su Marte
  posizione: {
    regione: {
      type: String,
      enum: ['Elysium Planitia', 'Valles Marineris', 'Olympus Mons', 
             'Hellas Planitia', 'Argyre Planitia', 'Tharsis'],
      default: 'Elysium Planitia'
    },
    lat: { type: Number, default: 4.5 },
    lng: { type: Number, default: 135.9 },
    altitudine: { type: Number, default: -4000 }
  },
  
  // Moduli
  moduli: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['abitativo', 'scientifico', 'energetico', 'agricolo', 'docks', 'commerciale', 'medico', 'stoccaggio']
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
    costoManutenzione: Number,
    protezioneRadiazioni: { type: Number, default: 0.9 },
    tenutaPressione: { type: Number, default: 0.95 }
  }],
  
  // Specifiche
  specifiche: {
    superficieTotale: { type: Number, default: 200 },
    moduliTotali: { type: Number, default: 6 },
    capacitaMassima: { type: Number, default: 20 },
    energiaDisponibile: { type: Number, default: 100 },
    ossigenoDisponibile: { type: Number, default: 2000 },
    acquaDisponibile: { type: Number, default: 10000 }
  },
  
  // Sistemi
  sistemi: {
    supportoVitale: {
      tipo: { type: String, default: 'Biologico + Meccanico' },
      capacita: { type: Number, default: 20 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    },
    energia: {
      tipo: { type: String, default: 'Solare + Nucleare' },
      capacita: { type: Number, default: 200 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    },
    comunicazione: {
      tipo: { type: String, default: 'Laser + Radio + Satellite' },
      portata: { type: Number, default: 1000000 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    },
    protezioneRadiazioni: {
      tipo: { type: String, default: 'Scudo + Regolite' },
      efficienza: { type: Number, default: 0.95 },
      stato: { type: String, enum: ['attivo', 'manutenzione', 'emergenza'], default: 'attivo' }
    }
  },
  
  // Equipaggio
  equipaggio: [{
    nome: String,
    ruolo: {
      type: String,
      enum: ['comandante', 'scienziato', 'ingegnere', 'medico', 'tecnico', 'geologo', 'biologo']
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
      totale: { type: Number, default: 2000 },
      consumata: { type: Number, default: 0 },
      prodotta: { type: Number, default: 200 },
      riserva: { type: Number, default: 1000 }
    },
    acqua: {
      totale: { type: Number, default: 10000 },
      consumata: { type: Number, default: 0 },
      riciclata: { type: Number, default: 0 },
      riserva: { type: Number, default: 4000 }
    },
    cibo: {
      totale: { type: Number, default: 5000 },
      consumato: { type: Number, default: 0 },
      prodotto: { type: Number, default: 200 },
      riserva: { type: Number, default: 1000 }
    },
    ossigeno: {
      totale: { type: Number, default: 20000 },
      consumato: { type: Number, default: 0 },
      prodotto: { type: Number, default: 400 },
      riserva: { type: Number, default: 2000 }
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

module.exports = mongoose.model('BaseMarte', baseMarteSchema);
