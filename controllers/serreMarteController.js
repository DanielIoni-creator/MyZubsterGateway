const SerreMarte = require('../models/SerreMarte');
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
    const serre = new SerreMarte({
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
    const serre = await SerreMarte.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: serre.length, serre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio serre
exports.getSerreDetails = async (req, res) => {
  try {
    const serre = await SerreMarte.findById(req.params.id);
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
    const serre = await SerreMarte.findByIdAndUpdate(
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
    await SerreMarte.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Serre eliminate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ SERRE ============

// Aggiungi serra
exports.aggiungiSerra = async (req, res) => {
  try {
    const serre = await SerreMarte.findById(req.params.id);
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
    const serre = await SerreMarte.findById(req.params.id);
    if (!serre) {
      return res.status(404).json({ error: 'Serre non trovate' });
    }
    
    const serra = serre.serre.id(serraId);
    if (!serra) {
      return res.status(404).json({ error: 'Serra non trovata' });
    }
    
    // Verifica risorse
    if (serre.risorse.acqua.disponibile < 15 || serre.risorse.nutrienti.disponibili < 8) {
      return res.status(400).json({ error: 'Risorse insufficienti' });
    }
    
    serre.risorse.acqua.disponibile -= 15;
    serre.risorse.nutrienti.disponibili -= 8;
    serre.risorse.co2.disponibile -= 5;
    
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
    const serre = await SerreMarte.findById(req.params.id);
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
    
    // Calcola resa su Marte (70% della Terra)
    const resaBase = coltura.quantita * 0.7;
    const resa = resaBase * (0.6 + Math.random() * 0.4);
    const qualita = Math.round(50 + Math.random() * 40);
    
    coltura.stato = 'raccolto';
    coltura.dataRaccolta = new Date();
    coltura.resa = Math.round(resa * 100) / 100;
    coltura.qualita = qualita;
    
    // Aggiorna produzione per tipo
    const tipo = coltura.tipo;
    if (serre.produzione[tipo] !== undefined) {
      serre.produzione[tipo] += resa;
    }
    serre.produzione.totale += resa;
    serre.statistiche.raccoltiTotali += 1;
    serre.statistiche.produzioneTotale += resa;
    
    // Calcola ricavo
    const ricavo = Math.round(resa * 15);
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
    const serre = await SerreMarte.findById(req.params.id);
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
        autosufficienza: Math.min(100, (serre.produzione.totale / 1000) * 100)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
