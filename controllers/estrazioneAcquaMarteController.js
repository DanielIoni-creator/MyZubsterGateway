const EstrazioneAcquaMarte = require('../models/EstrazioneAcquaMarte');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE ESTRAZIONE ============

// Registra sistema estrazione acqua
exports.registraEstrazione = async (req, res) => {
  try {
    const estrazione = new EstrazioneAcquaMarte({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await estrazione.save();
    res.status(201).json({ success: true, estrazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista sistemi estrazione
exports.getEstrazione = async (req, res) => {
  try {
    const estrazione = await EstrazioneAcquaMarte.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: estrazione.length, estrazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio sistema estrazione
exports.getEstrazioneDetails = async (req, res) => {
  try {
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    res.json({ success: true, estrazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna sistema estrazione
exports.updateEstrazione = async (req, res) => {
  try {
    const estrazione = await EstrazioneAcquaMarte.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    res.json({ success: true, estrazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina sistema estrazione
exports.deleteEstrazione = async (req, res) => {
  try {
    await EstrazioneAcquaMarte.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sistema estrazione eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ SITI ============

// Aggiungi sito
exports.aggiungiSito = async (req, res) => {
  try {
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    
    estrazione.siti.push(req.body);
    estrazione.updatedAt = Date.now();
    await estrazione.save();
    
    res.status(201).json({
      success: true,
      sito: estrazione.siti[estrazione.siti.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ ESTRAZIONE ============

// Avvia estrazione
exports.avviaEstrazione = async (req, res) => {
  try {
    const { sitoId, ore } = req.body;
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    
    const sito = estrazione.siti.id(sitoId);
    if (!sito) {
      return res.status(404).json({ error: 'Sito non trovato' });
    }
    
    if (sito.riserve.rimanenti <= 0) {
      return res.status(400).json({ error: 'Riserve esaurite' });
    }
    
    const quantita = (ore || 24) * 100; // 100 litri/ora
    const quantitaEstratta = Math.min(quantita, sito.riserve.rimanenti);
    
    sito.riserve.estratte += quantitaEstratta;
    sito.riserve.rimanenti -= quantitaEstratta;
    
    estrazione.produzione.totale += quantitaEstratta;
    estrazione.produzione.giornaliera += quantitaEstratta;
    estrazione.statistiche.acquaEstratta += quantitaEstratta;
    estrazione.statistiche.oreOperative += ore || 24;
    
    await estrazione.save();
    
    res.json({
      success: true,
      quantitaEstratta,
      sito: sito.nome,
      rimanenti: sito.riserve.rimanenti
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PURIFICAZIONE ============

// Purifica acqua
exports.purificaAcqua = async (req, res) => {
  try {
    const { quantita } = req.body;
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    
    if (!estrazione.purificazione.attiva) {
      return res.status(400).json({ error: 'Purificazione disattivata' });
    }
    
    const acquaPurificata = quantita * 0.95; // 5% perdita
    estrazione.statistiche.acquaPurificata += acquaPurificata;
    estrazione.qualita.purificata = true;
    
    await estrazione.save();
    
    res.json({
      success: true,
      acquaPurificata,
      qualita: estrazione.qualita
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ VENDITA ACQUA ============

// Vendi acqua
exports.vendiAcqua = async (req, res) => {
  try {
    const { quantita, prezzo } = req.body;
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    
    if (estrazione.stoccaggio.totale < quantita) {
      return res.status(400).json({ error: 'Acqua insufficiente' });
    }
    
    const costo = quantita * (prezzo || 5);
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    estrazione.stoccaggio.totale -= quantita;
    estrazione.statistiche.ricaviTotali += costo;
    
    await estrazione.save();
    
    res.json({
      success: true,
      vendita: {
        quantita,
        prezzo: prezzo || 5,
        totale: costo,
        valuta: 'MYZ',
        transactionId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche estrazione
exports.getStats = async (req, res) => {
  try {
    const estrazione = await EstrazioneAcquaMarte.findById(req.params.id);
    if (!estrazione) {
      return res.status(404).json({ error: 'Sistema estrazione non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        siti: estrazione.siti,
        produzione: estrazione.produzione,
        stoccaggio: estrazione.stoccaggio,
        qualita: estrazione.qualita,
        statistiche: estrazione.statistiche
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
