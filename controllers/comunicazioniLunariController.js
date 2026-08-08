const ComunicazioniLunari = require('../models/ComunicazioniLunari');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// ============ GESTIONE COMUNICAZIONI ============

// Registra sistema comunicazioni
exports.registraComunicazioni = async (req, res) => {
  try {
    const comms = new ComunicazioniLunari({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await comms.save();
    res.status(201).json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista sistemi comunicazioni
exports.getComunicazioni = async (req, res) => {
  try {
    const comms = await ComunicazioniLunari.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: comms.length, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio sistema comunicazioni
exports.getComunicazioniDetails = async (req, res) => {
  try {
    const comms = await ComunicazioniLunari.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazioni non trovato' });
    }
    res.json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna sistema comunicazioni
exports.updateComunicazioni = async (req, res) => {
  try {
    const comms = await ComunicazioniLunari.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazioni non trovato' });
    }
    res.json({ success: true, comms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina sistema comunicazioni
exports.deleteComunicazioni = async (req, res) => {
  try {
    await ComunicazioniLunari.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Sistema comunicazioni eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ CANALI ============

// Aggiungi canale
exports.aggiungiCanale = async (req, res) => {
  try {
    const comms = await ComunicazioniLunari.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazioni non trovato' });
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
    const comms = await ComunicazioniLunari.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazioni non trovato' });
    }
    
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    const messaggio = {
      tipo: tipo || 'dati',
      mittente: 'Lunar Base',
      destinatario,
      contenuto,
      dimensione: Buffer.byteLength(contenuto, 'utf8'),
      priorita: priorita || 'media',
      dataInvio: new Date(),
      stato: 'inviato',
      transactionId,
      criptato: true
    };
    
    comms.messaggi.push(messaggio);
    comms.statistiche.messaggiTotali += 1;
    comms.statistiche.messaggiInviati += 1;
    await comms.save();
    
    // Simula latenza
    const latenza = Math.random() * 1.3 + 1.2; // 1.2-2.5 secondi
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
        latenza: latenza.toFixed(2) + 's'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche comunicazioni
exports.getStats = async (req, res) => {
  try {
    const comms = await ComunicazioniLunari.findById(req.params.id);
    if (!comms) {
      return res.status(404).json({ error: 'Sistema comunicazioni non trovato' });
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
        canali: comms.canali,
        satellite: comms.satellite,
        stazioneTerra: comms.stazioneTerra
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
