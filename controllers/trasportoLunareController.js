const TrasportoLunare = require('../models/TrasportoLunare');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE TRASPORTO ============

// Registra sistema trasporto
exports.registraTrasporto = async (req, res) => {
  try {
    const trasporto = new TrasportoLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await trasporto.save();
    res.status(201).json({ success: true, trasporto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista sistemi trasporto
exports.getTrasporto = async (req, res) => {
  try {
    const trasporto = await TrasportoLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: trasporto.length, trasporto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio sistema trasporto
exports.getTrasportoDetails = async (req, res) => {
  try {
    const trasporto = await TrasportoLunare.findById(req.params.id);
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    res.json({ success: true, trasporto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna sistema trasporto
exports.updateTrasporto = async (req, res) => {
  try {
    const trasporto = await TrasportoLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    res.json({ success: true, trasporto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina sistema trasporto
exports.deleteTrasporto = async (req, res) => {
  try {
    await TrasportoLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sistema trasporto eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ VEICOLI ============

// Aggiungi veicolo
exports.aggiungiVeicolo = async (req, res) => {
  try {
    const trasporto = await TrasportoLunare.findById(req.params.id);
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    
    trasporto.veicoli.push(req.body);
    trasporto.statistiche.veicoliTotali += 1;
    trasporto.statistiche.veicoliAttivi += 1;
    trasporto.updatedAt = Date.now();
    await trasporto.save();
    
    res.status(201).json({
      success: true,
      veicolo: trasporto.veicoli[trasporto.veicoli.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ CORSE ============

// Pianifica corsa
exports.pianificaCorsa = async (req, res) => {
  try {
    const { veicoloId, partenza, destinazione, passeggeri, carico } = req.body;
    const trasporto = await TrasportoLunare.findById(req.params.id);
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    
    // Verifica veicolo
    const veicolo = trasporto.veicoli.id(veicoloId);
    if (!veicolo) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }
    
    if (veicolo.stato !== 'attivo') {
      return res.status(400).json({ error: 'Veicolo non disponibile' });
    }
    
    // Calcola costo
    const distanza = Math.random() * 100; // km
    const costoBase = distanza * 10;
    const costoTotale = costoBase + (passeggeri || 0) * 5 + (carico || 0) * 2;
    
    const corsa = {
      veicoloId,
      tipo: passeggeri ? 'passeggeri' : 'cargo',
      partenza: {
        stazione: partenza,
        orario: new Date()
      },
      destinazione: {
        stazione: destinazione,
        orario: new Date(Date.now() + distanza * 1000 * 60)
      },
      passeggeri: passeggeri || 0,
      carico: carico || 0,
      costo: costoTotale,
      stato: 'pianificata'
    };
    
    trasporto.corse.push(corsa);
    trasporto.statistiche.corseTotali += 1;
    veicolo.stato = 'in_viaggio';
    await trasporto.save();
    
    res.status(201).json({
      success: true,
      corsa: trasporto.corse[trasporto.corse.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Completa corsa
exports.completaCorsa = async (req, res) => {
  try {
    const { valutazione } = req.body;
    const trasporto = await TrasportoLunare.findById(req.params.id);
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    
    const corsa = trasporto.corse.id(req.params.corsaId);
    if (!corsa) {
      return res.status(404).json({ error: 'Corsa non trovata' });
    }
    
    corsa.stato = 'completata';
    corsa.destinazione.orario = new Date();
    corsa.valutazione = valutazione || 5;
    
    // Calcola ricavo
    const ricavo = corsa.costo * 0.8;
    corsa.ricavo = ricavo;
    
    const veicolo = trasporto.veicoli.id(corsa.veicoloId);
    if (veicolo) {
      veicolo.stato = 'attivo';
    }
    
    trasporto.statistiche.corseCompletate += 1;
    trasporto.statistiche.passeggeriTrasportati += corsa.passeggeri || 0;
    trasporto.statistiche.cargoTrasportato += corsa.carico || 0;
    trasporto.statistiche.kmPercorsi += Math.random() * 100;
    trasporto.statistiche.ricaviTotali += ricavo;
    
    await trasporto.save();
    
    res.json({
      success: true,
      corsa,
      ricavo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche trasporto
exports.getStats = async (req, res) => {
  try {
    const trasporto = await TrasportoLunare.findById(req.params.id);
    if (!trasporto) {
      return res.status(404).json({ error: 'Sistema trasporto non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        veicoli: trasporto.veicoli,
        infrastruttura: trasporto.infrastruttura,
        corse: trasporto.corse,
        statistiche: trasporto.statistiche
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
