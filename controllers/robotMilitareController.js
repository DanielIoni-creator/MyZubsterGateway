const RobotMilitare = require('../models/RobotMilitare');
const UnitaMilitare = require('../models/UnitaMilitare');
const Drone = require('../models/Drone');
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

// Registra robot militare
exports.registraRobot = async (req, res) => {
  try {
    const robot = new RobotMilitare({
      ...req.body,
      unitaId: req.body.unitaId || getUserId(req)
    });
    await robot.save();
    
    // Aggiorna unità
    await UnitaMilitare.findByIdAndUpdate(
      robot.unitaId,
      { $push: { robotIds: robot._id } }
    );
    
    res.status(201).json({ success: true, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista robot militari
exports.getRobot = async (req, res) => {
  try {
    const filter = req.query.unitaId ? 
      { unitaId: req.query.unitaId } : {};
    const robot = await RobotMilitare.find(filter)
      .populate('unitaId', 'nome codice');
    res.json({ success: true, count: robot.length, robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio robot
exports.getRobotDetails = async (req, res) => {
  try {
    const robot = await RobotMilitare.findById(req.params.id)
      .populate('unitaId', 'nome codice base');
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
    const robot = await RobotMilitare.findByIdAndUpdate(
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
    const robot = await RobotMilitare.findByIdAndDelete(req.params.id);
    if (!robot) {
      return res.status(404).json({ error: 'Robot non trovato' });
    }
    
    // Rimuovi dall'unità
    await UnitaMilitare.findByIdAndUpdate(
      robot.unitaId,
      { $pull: { robotIds: robot._id } }
    );
    
    res.json({ success: true, message: 'Robot eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ DRONI ============

// Registra drone
exports.registraDrone = async (req, res) => {
  try {
    const drone = new Drone({
      ...req.body,
      unitaId: req.body.unitaId || getUserId(req)
    });
    await drone.save();
    
    // Aggiorna unità
    await UnitaMilitare.findByIdAndUpdate(
      drone.unitaId,
      { $push: { droneIds: drone._id } }
    );
    
    res.status(201).json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista droni
exports.getDroni = async (req, res) => {
  try {
    const filter = req.query.unitaId ? 
      { unitaId: req.query.unitaId } : {};
    const droni = await Drone.find(filter)
      .populate('unitaId', 'nome codice');
    res.json({ success: true, count: droni.length, droni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio drone
exports.getDroneDetails = async (req, res) => {
  try {
    const drone = await Drone.findById(req.params.id)
      .populate('unitaId', 'nome codice base');
    if (!drone) {
      return res.status(404).json({ error: 'Drone non trovato' });
    }
    res.json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MISSIONI ============

// Avvia missione
exports.avviaMissione = async (req, res) => {
  try {
    const { robotId, droneId, missione } = req.body;
    let entity;
    let tipo = '';
    
    if (robotId) {
      entity = await RobotMilitare.findById(robotId);
      tipo = 'robot';
    } else if (droneId) {
      entity = await Drone.findById(droneId);
      tipo = 'drone';
    } else {
      return res.status(400).json({ error: 'robotId o droneId richiesto' });
    }
    
    if (!entity) {
      return res.status(404).json({ error: `${tipo} non trovato` });
    }
    
    const nuovaMissione = {
      ...missione,
      dataInizio: new Date(),
      status: 'in_corso'
    };
    
    entity.missioni.push(nuovaMissione);
    entity.stato = 'in_volo';
    entity.statistiche.missioniTotali += 1;
    await entity.save();
    
    res.json({
      success: true,
      missione: entity.missioni[entity.missioni.length - 1],
      entity: tipo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa missione
exports.completaMissione = async (req, res) => {
  try {
    const { missionId, rapporto, bersagli, danni } = req.body;
    
    // Cerca in RobotMilitare
    let entity = await RobotMilitare.findOne({ 'missioni._id': missionId });
    let tipo = 'robot';
    
    if (!entity) {
      entity = await Drone.findOne({ 'missioni._id': missionId });
      tipo = 'drone';
    }
    
    if (!entity) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const missione = entity.missioni.id(missionId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.status = 'completata';
    missione.dataFine = new Date();
    missione.rapporto = rapporto || 'Missione completata con successo';
    missione.danni = danni || 0;
    
    entity.statistiche.missioniCompletate += 1;
    
    if (bersagli) {
      entity.statistiche.bersagliNeutralizzati += bersagli;
    }
    
    entity.stato = 'attivo';
    await entity.save();
    
    res.json({
      success: true,
      missione,
      entity: tipo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche robot
exports.getStats = async (req, res) => {
  try {
    const { id, tipo } = req.params;
    let entity;
    
    if (tipo === 'robot') {
      entity = await RobotMilitare.findById(id);
    } else if (tipo === 'drone') {
      entity = await Drone.findById(id);
    } else {
      return res.status(400).json({ error: 'Tipo non valido' });
    }
    
    if (!entity) {
      return res.status(404).json({ error: 'Entità non trovata' });
    }
    
    res.json({
      success: true,
      stats: entity.statistiche,
      missioni: entity.missioni
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PAGAMENTI ============

// Paga per missione
exports.pagaMissione = async (req, res) => {
  try {
    const { missionId, importo, valuta } = req.body;
    
    let entity = await RobotMilitare.findOne({ 'missioni._id': missionId });
    let tipo = 'robot';
    
    if (!entity) {
      entity = await Drone.findOne({ 'missioni._id': missionId });
      tipo = 'drone';
    }
    
    if (!entity) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const missione = entity.missioni.id(missionId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    entity.statistiche.ricaviTotali += importo;
    await entity.save();
    
    res.json({
      success: true,
      pagamento: {
        missione: missione.nome,
        importo,
        valuta: valuta || 'MYZ',
        transactionId,
        status: 'completato'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
