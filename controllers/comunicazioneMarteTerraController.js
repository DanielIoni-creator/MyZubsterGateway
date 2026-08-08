const ComunicazioneMarteTerra = require('../models/ComunicazioneMarteTerra');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE COMUNICAZIONE ============

// Registra sistema comunicazione
exports.registraComunicazione = async (req, res) => {
  try {
    const comms = new ComunicazioneMarteTerra({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await comms.save();
    res.status(201).json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista sistemi comunicazione
exports.getComunicazione = async (req, res) => {
  try {
    const comms = await ComunicazioneMarteTerra.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: comms.length, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio sistema comunicazione
exports.getComunicazioneDetails = async (req, res) => {
  try {
    const comms = await ComunicazioneMarteTerra.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazione non trovato' });
    }
    res.json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna sistema comunicazione
exports.updateComunicazione = async (req, res) => {
  try {
    const comms = await ComunicazioneMarteTerra.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazione non trovato' });
    }
    res.json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina sistema comunicazione
exports.deleteComunicazione = async (req, res) => {
  try {
    await ComunicazioneMarteTerra.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sistema comunicazione eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ CANALI ============

// Aggiungi canale
exports.aggiungiCanale = async (req, res) => {
  try {
    const comms = await ComunicazioneMarteTerra.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazione non trovato' });
    }
    
    comms.canali.push(req.body);
    comms.updatedAt = Date.now();
    await comms.save();
    
    res.status(201).json({
      success: true,
      canale: comms.canali[comms.canali.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MESSAGGI ============

// Invia messaggio
exports.inviaMessaggio = async (req, res) => {
  try {
    const { destinatario, contenuto, tipo, priorita } = req.body;
    const comms = await ComunicazioneMarteTerra.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazione non trovato' });
    }
    
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    // Calcola latenza (da 3 a 22 minuti)
    const latenza = 3 + Math.random() * 19;
    
    const messaggio = {
      tipo: tipo || 'dati',
      mittente: 'Mars Base',
      destinatario,
      contenuto,
      dimensione: Buffer.byteLength(contenuto, 'utf8'),
      priorita: priorita || 'media',
      dataInvio: new Date(),
      stato: 'inviato',
      transactionId,
      criptato: true,
      latenzaReale: latenza
    };
    
    comms.messaggi.push(messaggio);
    comms.statistiche.messaggiTotali += 1;
    comms.statistiche.messaggiInviati += 1;
    await comms.save();
    
    // Simula ricezione dopo latenza
    setTimeout(async () => {
      const msg = comms.messaggi[comms.messaggi.length - 1];
      if (msg) {
        msg.stato = 'ricevuto';
        msg.dataRicezione = new Date();
        comms.statistiche.messaggiRicevuti += 1;
        await comms.save();
      }
    }, latenza * 1000);
    
    res.status(201).json({
      success: true,
      messaggio: {
        ...messaggio,
        latenzaReale: latenza.toFixed(1) + ' minuti'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche comunicazione
exports.getStats = async (req, res) => {
  try {
    const comms = await ComunicazioneMarteTerra.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazione non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        messaggiTotali: comms.statistiche.messaggiTotali,
        messaggiRicevuti: comms.statistiche.messaggiRicevuti,
        messaggiInviati: comms.statistiche.messaggiInviati,
        uptime: comms.statistiche.uptime,
        latenzaMedia: comms.statistiche.latenzaMedia,
        affidabilita: comms.statistiche.affidabilita,
        ricaviTotali: comms.statistiche.ricaviTotali,
        satelliti: comms.satelliti,
        stazioni: comms.stazioni,
        canali: comms.canali
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
