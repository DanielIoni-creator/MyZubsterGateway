const BaseLunare = require('../models/BaseLunare');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE BASE ============

// Crea Base Lunare
exports.creaBase = async (req, res) => {
  try {
    const base = new BaseLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await base.save();
    res.status(201).json({ success: true, base });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista Basi
exports.getBasi = async (req, res) => {
  try {
    const basi = await BaseLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: basi.length, basi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio Base
exports.getBaseDetails = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    res.json({ success: true, base });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna Base
exports.updateBase = async (req, res) => {
  try {
    const base = await BaseLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    res.json({ success: true, base });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina Base
exports.deleteBase = async (req, res) => {
  try {
    await BaseLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Base Lunare eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MODULI ============

// Aggiungi modulo
exports.aggiungiModulo = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    base.moduli.push(req.body);
    base.specifiche.moduliTotali += 1;
    base.updatedAt = Date.now();
    await base.save();
    
    res.status(201).json({
      success: true,
      modulo: base.moduli[base.moduli.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rimuovi modulo
exports.rimuoviModulo = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    base.moduli = base.moduli.filter(
      m => m._id.toString() !== req.params.moduloId
    );
    base.specifiche.moduliTotali -= 1;
    base.updatedAt = Date.now();
    await base.save();
    
    res.json({ success: true, message: 'Modulo rimosso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ EQUIPAGGIO ============

// Aggiungi equipaggio
exports.aggiungiEquipaggio = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    base.equipaggio.push(req.body);
    base.updatedAt = Date.now();
    await base.save();
    
    res.status(201).json({
      success: true,
      membro: base.equipaggio[base.equipaggio.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rimuovi equipaggio
exports.rimuoviEquipaggio = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    base.equipaggio = base.equipaggio.filter(
      e => e._id.toString() !== req.params.membroId
    );
    base.updatedAt = Date.now();
    await base.save();
    
    res.json({ success: true, message: 'Membro equipaggio rimosso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MISSIONI ============

// Pianifica missione
exports.pianificaMissione = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    const missione = {
      ...req.body,
      dataInizio: new Date(),
      status: 'pianificata'
    };
    
    base.missioni.push(missione);
    base.statistiche.missioniTotali += 1;
    await base.save();
    
    res.status(201).json({
      success: true,
      missione: base.missioni[base.missioni.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Avvia missione
exports.avviaMissione = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    const missione = base.missioni.id(req.params.missioneId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.status = 'in_corso';
    await base.save();
    
    res.json({
      success: true,
      missione
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa missione
exports.completaMissione = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    const missione = base.missioni.id(req.params.missioneId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.status = 'completata';
    missione.dataFine = new Date();
    missione.risultati = req.body.risultati || 'Missione completata con successo';
    missione.ricompensa = req.body.ricompensa || 0;
    
    base.statistiche.missioniCompletate += 1;
    base.statistiche.ricaviTotali += missione.ricompensa || 0;
    await base.save();
    
    res.json({
      success: true,
      missione,
      ricompensa: missione.ricompensa
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ RISORSE ============

// Aggiorna risorse
exports.aggiornaRisorse = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    Object.keys(req.body).forEach(key => {
      if (base.risorse[key]) {
        Object.keys(req.body[key]).forEach(subKey => {
          base.risorse[key][subKey] = req.body[key][subKey];
        });
      }
    });
    
    base.updatedAt = Date.now();
    await base.save();
    
    res.json({ success: true, risorse: base.risorse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche Base
exports.getStats = async (req, res) => {
  try {
    const base = await BaseLunare.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ error: 'Base Lunare non trovata' });
    }
    
    res.json({
      success: true,
      stats: {
        moduli: base.moduli.length,
        equipaggio: base.equipaggio.length,
        missioniTotali: base.statistiche.missioniTotali,
        missioniCompletate: base.statistiche.missioniCompletate,
        risorse: base.risorse,
        specifiche: base.specifiche,
        sistemi: base.sistemi
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
