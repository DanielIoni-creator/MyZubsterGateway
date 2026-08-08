const mongoose = require('mongoose');

const trasportoMarteSchema = new mongoose.Schema({
  // Identificazione
  nome: {
    type: String,
    default: 'MyZubster Martian Transport System'
  },
  codice: {
    type: String,
    required: true,
    unique: true
  },
  versione: {
    type: String,
    default: 'Transport Mars v1.0'
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
  
  // Veicoli
  veicoli: [{
    nome: String,
    tipo: {
      type: String,
      enum: ['rover_esplorazione', 'rover_cargo', 'rover_passeggeri', 'rover_emergenza', 'rover_ricerca']
    },
    modello: String,
    capacita: {
      passeggeri: Number,
      carico: Number
    },
    autonomia: Number,
    velocita: Number,
    stato: {
      type: String,
      enum: ['attivo', 'in_viaggio', 'manutenzione', 'danneggiato'],
      default: 'attivo'
    },
    posizione: {
      lat: Number,
      lng: Number,
      altitudine: Number,
      ultimoAggiornamento: Date
    },
    consumi: {
      energia: Number,
      manutenzione: Number
    },
    costo: {
      acquisto: Number,
      manutenzione: Number,
      operativo: Number
    },
    resistenza: {
      polvere: { type: Number, default: 0.9 },
      temperatura: { type: Number, default: 0.85 },
      radiazione: { type: Number, default: 0.8 }
    }
  }],
  
  // Infrastruttura
  infrastruttura: {
    strade: [{
      nome: String,
      lunghezza: Number,
      stato: {
        type: String,
        enum: ['attiva', 'manutenzione', 'danneggiata'],
        default: 'attiva'
      },
      connessioni: [String],
      tipo: {
        type: String,
        enum: ['principale', 'secondaria', 'locale'],
        default: 'secondaria'
      }
    }],
    stazioni: [{
      nome: String,
      posizione: { lat: Number, lng: Number },
      tipo: {
        type: String,
        enum: ['passeggeri', 'cargo', 'mista', 'emergenza', 'ricerca']
      },
      capacita: Number,
      servizi: [String],
      stato: {
        type: String,
        enum: ['attiva', 'manutenzione', 'chiusa'],
        default: 'attiva'
      },
      personale: Number
    }],
    rifornimento: [{
      nome: String,
      posizione: { lat: Number, lng: Number },
      capacita: Number,
      disponibile: Number,
      prezzo: Number,
      tipoEnergia: {
        type: String,
        enum: ['elettrico', 'idrogeno', 'solare'],
        default: 'elettrico'
      }
    }]
  },
  
  // Corse
  corse: [{
    veicoloId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veicolo'
    },
    tipo: {
      type: String,
      enum: ['passeggeri', 'cargo', 'emergenza', 'ricerca', 'esplorazione']
    },
    partenza: {
      stazione: String,
      orario: Date
    },
    destinazione: {
      stazione: String,
      orario: Date
    },
    passeggeri: Number,
    carico: Number,
    costo: Number,
    ricavo: Number,
    stato: {
      type: String,
      enum: ['pianificata', 'in_corso', 'completata', 'cancellata']
    },
    valutazione: Number,
    distanza: Number
  }],
  
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
    veicoliTotali: { type: Number, default: 0 },
    veicoliAttivi: { type: Number, default: 0 },
    corseTotali: { type: Number, default: 0 },
    corseCompletate: { type: Number, default: 0 },
    passeggeriTrasportati: { type: Number, default: 0 },
    cargoTrasportato: { type: Number, default: 0 },
    kmPercorsi: { type: Number, default: 0 },
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
    enum: ['attivo', 'operativo', 'manutenzione', 'emergenza'],
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

module.exports = mongoose.model('TrasportoMarte', trasportoMarteSchema);
