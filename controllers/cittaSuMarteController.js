const CittaSuMarte = require('../models/CittaSuMarte');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE CITTÀ ============

// Crea città
exports.creaCitta = async (req, res) => {
  try {
    const citta = new CittaSuMarte({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await citta.save();
    res.status(201).json({ success: true, citta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista città
exports.getCitta = async (req, res) => {
  try {
    const citta = await CittaSuMarte.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: citta.length, citta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio città
exports.getCittaDetails = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findById(req.params.id);
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    res.json({ success: true, citta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna città
exports.updateCitta = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    res.json({ success: true, citta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina città
exports.deleteCitta = async (req, res) => {
  try {
    await CittaSuMarte.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Città eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ ZONE ============

// Aggiungi zona
exports.aggiungiZona = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findById(req.params.id);
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    
    citta.zone.push(req.body);
    citta.updatedAt = Date.now();
    await citta.save();
    
    res.status(201).json({
      success: true,
      zona: citta.zone[citta.zone.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna zona
exports.updateZona = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findById(req.params.id);
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    
    const zona = citta.zone.id(req.params.zonaId);
    if (!zona) {
      return res.status(404).json({ error: 'Zona non trovata' });
    }
    
    Object.assign(zona, req.body);
    citta.updatedAt = Date.now();
    await citta.save();
    
    res.json({ success: true, zona });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ EDIFICI ============

// Aggiungi edificio
exports.aggiungiEdificio = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findById(req.params.id);
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    
    citta.edifici.push(req.body);
    citta.statistiche.edificiTotali += 1;
    citta.updatedAt = Date.now();
    await citta.save();
    
    res.status(201).json({
      success: true,
      edificio: citta.edifici[citta.edifici.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche città
exports.getStats = async (req, res) => {
  try {
    const citta = await CittaSuMarte.findById(req.params.id);
    if (!citta) {
      return res.status(404).json({ error: 'Città non trovata' });
    }
    
    // Calcola indice qualità
    const qualita = Math.min(100, 
      (citta.statistiche.verdePubblico / citta.layout.superficieTotale * 100) * 0.2 +
      (citta.servizi.ospedale.presente ? 20 : 0) +
      (citta.servizi.scuole.presenti ? 20 : 0) +
      (citta.servizi.mercato.presente ? 15 : 0) +
      (citta.servizi.cultura.presente ? 15 : 0) +
      (citta.servizi.sport.presente ? 10 : 0)
    );
    
    // Calcola sostenibilità
    const sostenibilita = Math.min(100,
      (citta.sostenibilita.energiaRinnovabile || 0) * 0.3 +
      (citta.sostenibilita.riciclo || 0) * 0.3 +
      (citta.sostenibilita.agricolturaUrbana || 0) * 0.2 +
      (citta.sostenibilita.qualitaAria || 0) * 0.2
    );
    
    citta.statistiche.indiceQualita = Math.round(qualita);
    citta.sostenibilita.indiceSostenibilita = Math.round(sostenibilita);
    await citta.save();
    
    res.json({
      success: true,
      stats: {
        zone: citta.zone,
        edifici: citta.edifici,
        popolazione: citta.popolazione,
        infrastrutture: citta.infrastrutture,
        servizi: citta.servizi,
        qualita: citta.statistiche.indiceQualita,
        sostenibilita: citta.sostenibilita.indiceSostenibilita,
        layout: citta.layout
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
