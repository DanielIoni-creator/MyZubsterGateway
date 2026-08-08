const EnergiaLunare = require('../models/EnergiaLunare');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE ENERGIA ============

// Registra sistema energetico
exports.registraEnergia = async (req, res) => {
  try {
    const energia = new EnergiaLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await energia.save();
    res.status(201).json({ success: true, energia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista sistemi energetici
exports.getEnergia = async (req, res) => {
  try {
    const energia = await EnergiaLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: energia.length, energia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio sistema energetico
exports.getEnergiaDetails = async (req, res) => {
  try {
    const energia = await EnergiaLunare.findById(req.params.id);
    if (!energia) {
      return res.status(404).json({ error: 'Sistema energetico non trovato' });
    }
    res.json({ success: true, energia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna sistema energetico
exports.updateEnergia = async (req, res) => {
  try {
    const energia = await EnergiaLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!energia) {
      return res.status(404).json({ error: 'Sistema energetico non trovato' });
    }
    res.json({ success: true, energia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina sistema energetico
exports.deleteEnergia = async (req, res) => {
  try {
    await EnergiaLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sistema energetico eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PRODUZIONE ============

// Avvia produzione
exports.avviaProduzione = async (req, res) => {
  try {
    const { fonte, ore } = req.body;
    const energia = await EnergiaLunare.findById(req.params.id);
    if (!energia) {
      return res.status(404).json({ error: 'Sistema energetico non trovato' });
    }
    
    const fonteData = energia.fonti[fonte];
    if (!fonteData || !fonteData.attivo) {
      return res.status(400).json({ error: 'Fonte non attiva' });
    }
    
    const produzione = fonteData.capacita * fonteData.efficienza * (ore || 1);
    fonteData.produzione += produzione;
    energia.statistiche.energiaProdotta += produzione;
    energia.statistiche.oreOperative += (ore || 1);
    
    // Ricarica batterie
    const batteria = energia.accumulo.batterie;
    const spazioDisponibile = batteria.capacita - batteria.carica;
    const caricaEffettiva = Math.min(produzione * 0.7, spazioDisponibile);
    batteria.carica += caricaEffettiva;
    
    await energia.save();
    
    res.json({
      success: true,
      produzione,
      caricaEffettiva,
      batteria: energia.accumulo.batterie,
      stats: energia.statistiche
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ CONSUMO ============

// Consuma energia
exports.consumaEnergia = async (req, res) => {
  try {
    const { consumo } = req.body;
    const energia = await EnergiaLunare.findById(req.params.id);
    if (!energia) {
      return res.status(404).json({ error: 'Sistema energetico non trovato' });
    }
    
    const batteria = energia.accumulo.batterie;
    if (batteria.carica < consumo) {
      return res.status(400).json({ error: 'Energia insufficiente' });
    }
    
    batteria.carica -= consumo;
    energia.statistiche.energiaConsumata += consumo;
    await energia.save();
    
    res.json({
      success: true,
      consumo,
      batteria: energia.accumulo.batterie,
      stats: energia.statistiche
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche energia
exports.getStats = async (req, res) => {
  try {
    const energia = await EnergiaLunare.findById(req.params.id);
    if (!energia) {
      return res.status(404).json({ error: 'Sistema energetico non trovato' });
    }
    
    const autonomia = energia.accumulo.batterie.carica / (energia.statistiche.energiaConsumata / (energia.statistiche.oreOperative || 1));
    
    res.json({
      success: true,
      stats: {
        produzione: energia.statistiche.energiaProdotta,
        consumo: energia.statistiche.energiaConsumata,
        accumulo: energia.accumulo.batterie.carica,
        autonomia: autonomia.toFixed(1) + ' ore',
        fonti: energia.fonti,
        batteria: energia.accumulo.batterie,
        efficienza: energia.statistiche.efficienzaMedia
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
