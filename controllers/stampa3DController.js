const Stampa3DLunare = require('../models/Stampa3DLunare');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE STAMPANTE ============

// Registra stampante
exports.registraStampante = async (req, res) => {
  try {
    const stampante = new Stampa3DLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await stampante.save();
    res.status(201).json({ success: true, stampante });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista stampanti
exports.getStampanti = async (req, res) => {
  try {
    const stampanti = await Stampa3DLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: stampanti.length, stampanti });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio stampante
exports.getStampanteDetails = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    res.json({ success: true, stampante });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna stampante
exports.updateStampante = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    res.json({ success: true, stampante });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina stampante
exports.deleteStampante = async (req, res) => {
  try {
    await Stampa3DLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Stampante 3D eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PROGETTI ============

// Crea progetto
exports.creaProgetto = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    
    // Verifica materiali disponibili
    const materiali = req.body.materialeUsato || {};
    if (stampante.materiali.regolite.disponibile < (materiali.regolite || 0) ||
        stampante.materiali.polimeri.disponibile < (materiali.polimeri || 0) ||
        stampante.materiali.leganti.disponibile < (materiali.leganti || 0)) {
      return res.status(400).json({ error: 'Materiali insufficienti' });
    }
    
    const progetto = {
      ...req.body,
      dataInizio: new Date(),
      stato: 'pianificato'
    };
    
    stampante.progetti.push(progetto);
    stampante.statistiche.progettiTotali += 1;
    await stampante.save();
    
    res.status(201).json({
      success: true,
      progetto: stampante.progetti[stampante.progetti.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Avvia stampa
exports.avviaStampa = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    
    const progetto = stampante.progetti.id(req.params.progettoId);
    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }
    
    // Consuma materiali
    const materiali = progetto.materialeUsato || {};
    stampante.materiali.regolite.disponibile -= materiali.regolite || 0;
    stampante.materiali.polimeri.disponibile -= materiali.polimeri || 0;
    stampante.materiali.leganti.disponibile -= materiali.leganti || 0;
    
    progetto.stato = 'in_corso';
    stampante.stato = 'in_stampa';
    await stampante.save();
    
    res.json({
      success: true,
      progetto
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa stampa
exports.completaStampa = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    
    const progetto = stampante.progetti.id(req.params.progettoId);
    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }
    
    progetto.stato = 'completato';
    progetto.dataFine = new Date();
    progetto.valutazione = req.body.valutazione || 5;
    
    stampante.statistiche.progettiCompletati += 1;
    stampante.statistiche.oreStampaggio += progetto.tempoStampaggio || 0;
    stampante.stato = 'attivo';
    await stampante.save();
    
    res.json({
      success: true,
      progetto
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MATERIALI ============

// Aggiungi materiali
exports.aggiungiMateriali = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    
    const { tipo, quantita } = req.body;
    if (stampante.materiali[tipo]) {
      stampante.materiali[tipo].disponibile += quantita;
      await stampante.save();
      
      res.json({
        success: true,
        materiale: stampante.materiali[tipo]
      });
    } else {
      res.status(400).json({ error: 'Tipo materiale non valido' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche stampante
exports.getStats = async (req, res) => {
  try {
    const stampante = await Stampa3DLunare.findById(req.params.id);
    if (!stampante) {
      return res.status(404).json({ error: 'Stampante 3D non trovata' });
    }
    
    res.json({
      success: true,
      stats: {
        progettiTotali: stampante.statistiche.progettiTotali,
        progettiCompletati: stampante.statistiche.progettiCompletati,
        materialeUtilizzato: stampante.statistiche.materialeUtilizzato,
        oreStampaggio: stampante.statistiche.oreStampaggio,
        ricaviTotali: stampante.statistiche.ricaviTotali,
        valutazioneMedia: stampante.statistiche.valutazioneMedia,
        materiali: stampante.materiali
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
