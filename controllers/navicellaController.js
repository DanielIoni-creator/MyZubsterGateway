const Navicella = require('../models/Navicella');
const CentroControllo = require('../models/CentroControllo');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE NAVICELLE ============

// Registra navicella
exports.registraNavicella = async (req, res) => {
  try {
    const navicella = new Navicella({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await navicella.save();
    res.status(201).json({ success: true, navicella });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista navicelle
exports.getNavicelle = async (req, res) => {
  try {
    const navicelle = await Navicella.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: navicelle.length, navicelle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio navicella
exports.getNavicella = async (req, res) => {
  try {
    const navicella = await Navicella.findById(req.params.id);
    if (!navicella) {
      return res.status(404).json({ error: 'Navicella non trovata' });
    }
    res.json({ success: true, navicella });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna navicella
exports.updateNavicella = async (req, res) => {
  try {
    const navicella = await Navicella.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!navicella) {
      return res.status(404).json({ error: 'Navicella non trovata' });
    }
    res.json({ success: true, navicella });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina navicella
exports.deleteNavicella = async (req, res) => {
  try {
    await Navicella.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Navicella eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MISSIONI ============

// Pianifica missione
exports.pianificaMissione = async (req, res) => {
  try {
    const { navicellaId, missione } = req.body;
    
    const navicella = await Navicella.findById(navicellaId);
    if (!navicella) {
      return res.status(404).json({ error: 'Navicella non trovata' });
    }
    
    // Genera transaction ID
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    // Calcola costo missione
    const costo = missione.costo || 1000;
    
    // Aggiungi missione
    navicella.missioni.push({
      ...missione,
      transactionId,
      dataPartenza: new Date(),
      stato: 'pianificata'
    });
    
    navicella.statistiche.missioniTotali += 1;
    await navicella.save();
    
    res.status(201).json({
      success: true,
      missione: {
        ...missione,
        transactionId,
        id: navicella.missioni[navicella.missioni.length - 1]._id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Avvia missione
exports.avviaMissione = async (req, res) => {
  try {
    const { id } = req.params;
    const navicella = await Navicella.findOne({
      'missioni._id': id
    });
    
    if (!navicella) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const missione = navicella.missioni.id(id);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.stato = 'in_corso';
    navicella.stato = 'in_viaggio';
    await navicella.save();
    
    res.json({
      success: true,
      message: 'Missione avviata! 🚀',
      missione
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa missione
exports.completaMissione = async (req, res) => {
  try {
    const { id } = req.params;
    const navicella = await Navicella.findOne({
      'missioni._id': id
    });
    
    if (!navicella) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const missione = navicella.missioni.id(id);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.stato = 'completata';
    missione.dataArrivoEffettiva = new Date();
    navicella.stato = 'atterrata';
    navicella.statistiche.missioniCompletate += 1;
    navicella.statistiche.ricaviTotali += missione.costo || 0;
    
    await navicella.save();
    
    res.json({
      success: true,
      message: 'Missione completata! 🌟',
      missione
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ RIFORNIMENTO ============

// Rifornisci navicella
exports.rifornisciNavicella = async (req, res) => {
  try {
    const { navicellaId, centroId, quantita, valuta } = req.body;
    
    const navicella = await Navicella.findById(navicellaId);
    if (!navicella) {
      return res.status(404).json({ error: 'Navicella non trovata' });
    }
    
    const centro = await CentroControllo.findById(centroId);
    if (!centro) {
      return res.status(404).json({ error: 'Centro di controllo non trovato' });
    }
    
    const costo = quantita * centro.prezzi.rifornimento;
    const valutaUsata = valuta || navicella.blockchain || 'MYZ';
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    navicella.statistiche.oreVolo += quantita * 10;
    navicella.statistiche.distanzaPercorsa += quantita * 100;
    await navicella.save();
    
    res.json({
      success: true,
      rifornimento: {
        quantita,
        costo: costo.toFixed(2),
        valuta: valutaUsata,
        transactionId,
        centro: centro.nome
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche navicella
exports.getStats = async (req, res) => {
  try {
    const navicella = await Navicella.findById(req.params.id);
    if (!navicella) {
      return res.status(404).json({ error: 'Navicella non trovata' });
    }
    
    res.json({
      success: true,
      stats: {
        missioniTotali: navicella.statistiche.missioniTotali,
        missioniCompletate: navicella.statistiche.missioniCompletate,
        distanzaPercorsa: navicella.statistiche.distanzaPercorsa,
        oreVolo: navicella.statistiche.oreVolo,
        ricaviTotali: navicella.statistiche.ricaviTotali,
        valuta: navicella.statistiche.valuta
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
