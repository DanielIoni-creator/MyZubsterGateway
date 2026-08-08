const EstrazioneRisorse = require('../models/EstrazioneRisorse');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE ESTRATTORE ============

// Registra estrattore
exports.registraEstrattore = async (req, res) => {
  try {
    const estrattore = new EstrazioneRisorse({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await estrattore.save();
    res.status(201).json({ success: true, estrattore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista estrattori
exports.getEstrattori = async (req, res) => {
  try {
    const estrattori = await EstrazioneRisorse.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: estrattori.length, estrattori });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio estrattore
exports.getEstrattoreDetails = async (req, res) => {
  try {
    const estrattore = await EstrazioneRisorse.findById(req.params.id);
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    res.json({ success: true, estrattore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna estrattore
exports.updateEstrattore = async (req, res) => {
  try {
    const estrattore = await EstrazioneRisorse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    res.json({ success: true, estrattore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina estrattore
exports.deleteEstrattore = async (req, res) => {
  try {
    await EstrazioneRisorse.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Estrattore eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ OPERAZIONI ============

// Avvia estrazione
exports.avviaEstrazione = async (req, res) => {
  try {
    const { risorsa, quantita, durata } = req.body;
    const estrattore = await EstrazioneRisorse.findById(req.params.id);
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    
    // Verifica capacità
    if (estrattore.risorse[risorsa].estratto + quantita > estrattore.risorse[risorsa].capacita) {
      return res.status(400).json({ error: 'Capacità insufficiente' });
    }
    
    const operazione = {
      tipo: 'estrazione',
      risorsa,
      quantita,
      durata: durata || 24,
      dataInizio: new Date(),
      stato: 'in_corso'
    };
    
    estrattore.operazioni.push(operazione);
    estrattore.stato = 'in_estrazione';
    estrattore.statistiche.operazioniTotali += 1;
    await estrattore.save();
    
    res.status(201).json({
      success: true,
      operazione: estrattore.operazioni[estrattore.operazioni.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa estrazione
exports.completaEstrazione = async (req, res) => {
  try {
    const { valutazione } = req.body;
    const estrattore = await EstrazioneRisorse.findById(req.params.id);
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    
    const operazione = estrattore.operazioni.id(req.params.operazioneId);
    if (!operazione) {
      return res.status(404).json({ error: 'Operazione non trovata' });
    }
    
    operazione.stato = 'completata';
    operazione.dataFine = new Date();
    operazione.valutazione = valutazione || 5;
    
    // Aggiorna risorse estratte
    const risorsa = operazione.risorsa;
    estrattore.risorse[risorsa].estratto += operazione.quantita;
    
    // Calcola ricavo
    const prezzo = estrattore.risorse[risorsa].prezzo;
    const ricavo = operazione.quantita * prezzo;
    operazione.ricavo = ricavo;
    
    estrattore.statistiche.operazioniCompletate += 1;
    estrattore.statistiche.risorseEstratte += operazione.quantita;
    estrattore.statistiche.ricaviTotali += ricavo;
    estrattore.statistiche.oreOperative += operazione.durata || 0;
    estrattore.stato = 'attivo';
    
    await estrattore.save();
    
    res.json({
      success: true,
      operazione,
      ricavo,
      risorsa: estrattore.risorse[risorsa]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ VENDITA RISORSE ============

// Vendi risorsa
exports.vendiRisorsa = async (req, res) => {
  try {
    const { risorsa, quantita } = req.body;
    const estrattore = await EstrazioneRisorse.findById(req.params.id);
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    
    if (estrattore.risorse[risorsa].estratto < quantita) {
      return res.status(400).json({ error: 'Quantità insufficiente' });
    }
    
    const prezzo = estrattore.risorse[risorsa].prezzo;
    const totale = quantita * prezzo;
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    // Riduci risorsa
    estrattore.risorse[risorsa].estratto -= quantita;
    estrattore.statistiche.ricaviTotali += totale;
    await estrattore.save();
    
    res.json({
      success: true,
      vendita: {
        risorsa,
        quantita,
        prezzo,
        totale,
        valuta: 'MYZ',
        transactionId,
        data: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche estrattore
exports.getStats = async (req, res) => {
  try {
    const estrattore = await EstrazioneRisorse.findById(req.params.id);
    if (!estrattore) {
      return res.status(404).json({ error: 'Estrattore non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        operazioniTotali: estrattore.statistiche.operazioniTotali,
        operazioniCompletate: estrattore.statistiche.operazioniCompletate,
        risorseEstratte: estrattore.statistiche.risorseEstratte,
        oreOperative: estrattore.statistiche.oreOperative,
        ricaviTotali: estrattore.statistiche.ricaviTotali,
        risorse: estrattore.risorse
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
