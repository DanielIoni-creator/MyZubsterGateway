const SerreLunari = require('../models/SerreLunari');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE SERRE ============

// Registra serre
exports.registraSerre = async (req, res) => {
  try {
    const serre = new SerreLunari({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await serre.save();
    res.status(201).json({ success: true, serre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista serre
exports.getSerre = async (req, res) => {
  try {
    const serre = await SerreLunari.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: serre.length, serre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio serre
exports.getSerreDetails = async (req, res) => {
  try {
    const serre = await SerreLunari.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    res.json({ success: true, serre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna serre
exports.updateSerre = async (req, res) => {
  try {
    const serre = await SerreLunari.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    res.json({ success: true, serre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina serre
exports.deleteSerre = async (req, res) => {
  try {
    await SerreLunari.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Serre eliminate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ SERRE ============

// Aggiungi serra
exports.aggiungiSerra = async (req, res) => {
  try {
    const serre = await SerreLunari.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    
    serre.serre.push(req.body);
    serre.updatedAt = Date.now();
    await serre.save();
    
    res.status(201).json({
      success: true,
      serra: serre.serre[serre.serre.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ COLTURE ============

// Pianta coltura
exports.piantaColtura = async (req, res) => {
  try {
    const { serraId, coltura } = req.body;
    const serre = await SerreLunari.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    
    const serra = serre.serre.id(serraId);
    if (!serra) {
      return res.status(404).json({ error: 'Serra non trovata' });
    }
    
    // Verifica risorse
    if (serre.risorse.acqua.disponibile < 10 || serre.risorse.nutrienti.disponibili < 5) {
      return res.status(400).json({ error: 'Risorse insufficienti' });
    }
    
    serre.risorse.acqua.disponibile -= 10;
    serre.risorse.nutrienti.disponibili -= 5;
    
    coltura.dataPiantagione = new Date();
    coltura.stato = 'piantato';
    serra.colture.push(coltura);
    serra.superficieColtivata += coltura.quantita || 1;
    
    await serre.save();
    
    res.status(201).json({
      success: true,
      coltura: serra.colture[serra.colture.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Raccogli coltura
exports.raccogliColtura = async (req, res) => {
  try {
    const { serraId, colturaId } = req.params;
    const serre = await SerreLunari.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    
    const serra = serre.serre.id(serraId);
    if (!serra) {
      return res.status(404).json({ error: 'Serra non trovata' });
    }
    
    const coltura = serra.colture.id(colturaId);
    if (!coltura) {
      return res.status(404).json({ error: 'Coltura non trovata' });
    }
    
    // Calcola resa
    const resa = coltura.quantita * (0.5 + Math.random() * 0.5);
    const qualita = Math.round(60 + Math.random() * 40);
    
    coltura.stato = 'raccolto';
    coltura.dataRaccolta = new Date();
    coltura.resa = Math.round(resa * 100) / 100;
    coltura.qualita = qualita;
    
    serre.produzione.totale += resa;
    serre.statistiche.raccoltiTotali += 1;
    serre.statistiche.produzioneTotale += resa;
    
    // Calcola ricavo
    const ricavo = Math.round(resa * 10);
    serre.statistiche.ricaviTotali += ricavo;
    
    await serre.save();
    
    res.json({
      success: true,
      coltura,
      ricavo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche serre
exports.getStats = async (req, res) => {
  try {
    const serre = await SerreLunari.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    
    res.json({
      success: true,
      stats: {
        serre: serre.serre,
        produzione: serre.produzione,
        risorse: serre.risorse,
        statistiche: serre.statistiche,
        autosufficienza: serre.statistiche.autosufficienza
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
