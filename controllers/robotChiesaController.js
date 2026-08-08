const RobotChiesa = require('../models/RobotChiesa');
const Parrocchia = require('../models/Parrocchia');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE ROBOT ============

// Registra robot
exports.registraRobot = async (req, res) => {
  try {
    const robot = new RobotChiesa({
      ...req.body,
      parrocchiaId: req.body.parrocchiaId || getUserId(req)
    });
    await robot.save();
    
    // Aggiorna parrocchia
    await Parrocchia.findByIdAndUpdate(
      robot.parrocchiaId,
      { $push: { robotIds: robot._id } }
    );
    
    res.status(201).json({ success: true, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista robot
exports.getRobot = async (req, res) => {
  try {
    const filter = req.query.parrocchiaId ? 
      { parrocchiaId: req.query.parrocchiaId } : {};
    const robot = await RobotChiesa.find(filter).populate('parrocchiaId', 'nome');
    res.json({ success: true, count: robot.length, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio robot
exports.getRobotDetails = async (req, res) => {
  try {
    const robot = await RobotChiesa.findById(req.params.id)
      .populate('parrocchiaId', 'nome indirizzo');
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    res.json({ success: true, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna robot
exports.updateRobot = async (req, res) => {
  try {
    const robot = await RobotChiesa.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    res.json({ success: true, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina robot
exports.deleteRobot = async (req, res) => {
  try {
    const robot = await RobotChiesa.findByIdAndDelete(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    // Rimuovi dalla parrocchia
    await Parrocchia.findByIdAndUpdate(
      robot.parrocchiaId,
      { $pull: { robotIds: robot._id } }
    );
    
    res.json({ success: true, message: 'Robot eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ SERVIZI ============

// Registra servizio
exports.registraServizio = async (req, res) => {
  try {
    const { tipo, descrizione, partecipanti } = req.body;
    const robot = await RobotChiesa.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    robot.servizi.push({
      tipo,
      data: new Date(),
      descrizione,
      partecipanti: partecipanti || 0
    });
    
    robot.statistiche.serviziTotali += 1;
    robot.statistiche.fedeliServiti += partecipanti || 0;
    robot.statistiche.oreServizio += 1;
    
    await robot.save();
    
    res.status(201).json({
      success: true,
      servizio: robot.servizi[robot.servizi.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ DONAZIONI ============

// Ricevi donazione
exports.riceviDonazione = async (req, res) => {
  try {
    const { importo, valuta, motivo, anonimo } = req.body;
    const robot = await RobotChiesa.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    robot.donazioni.push({
      data: new Date(),
      importo,
      valuta: valuta || 'MYZ',
      transactionId,
      motivo: motivo || 'Offerta libera',
      anonimo: anonimo !== undefined ? anonimo : true
    });
    
    robot.statistiche.donazioniTotali += importo;
    await robot.save();
    
    res.json({
      success: true,
      donazione: {
        importo,
        valuta: valuta || 'MYZ',
        transactionId,
        motivo: motivo || 'Offerta libera'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche robot
exports.getStats = async (req, res) => {
  try {
    const robot = await RobotChiesa.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        serviziTotali: robot.statistiche.serviziTotali,
        fedeliServiti: robot.statistiche.fedeliServiti,
        donazioniTotali: robot.statistiche.donazioniTotali,
        valutazioneMedia: robot.statistiche.valutazioneMedia,
        oreServizio: robot.statistiche.oreServizio
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PREGHIERA ============

// Guida preghiera
exports.guidaPreghiera = async (req, res) => {
  try {
    const { preghiera, intenzione } = req.body;
    const robot = await RobotChiesa.findById(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    // Simula guida alla preghiera
    const risposta = {
      robot: robot.nome,
      preghiera: preghiera || 'Padre Nostro',
      intenzione: intenzione || 'Per la pace nel mondo',
      status: 'in_preghiera',
      timestamp: new Date().toISOString()
    };
    
    robot.stato = 'in_preghiera';
    await robot.save();
    
    res.json({
      success: true,
      preghiera: risposta
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
