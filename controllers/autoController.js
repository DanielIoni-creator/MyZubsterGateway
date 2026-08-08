const Auto = require('../models/Auto');
const Stazione = require('../models/Stazione');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Genera un ObjectId valido per i test
const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

// Middleware per ottenere l'ID utente
const getUserId = (req) => {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    return req.user._id;
  }
  return DEFAULT_USER_ID;
};

// Verifica che un ID sia valido
const isValidId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

exports.registraAuto = async (req, res) => {
  try {
    const auto = new Auto({
    walletAddress: req.body.walletAddress || 'myz_wallet_default', 
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await auto.save();
    res.status(201).json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAuto = async (req, res) => {
  try {
    const userId = getUserId(req);
    const auto = await Auto.find({ proprietarioId: userId });
    res.json({ success: true, count: auto.length, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAutoDetails = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID auto non valido' });
    }
    const auto = await Auto.findById(req.params.id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    res.json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAuto = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID auto non valido' });
    }
    const auto = await Auto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    res.json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAuto = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID auto non valido' });
    }
    const auto = await Auto.findByIdAndDelete(req.params.id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    res.json({ success: true, message: 'Auto eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rifornisci = async (req, res) => {
  try {
    const { autoId, stazioneId, quantita, valuta } = req.body;
    
    if (!autoId || !stazioneId || !quantita) {
      return res.status(400).json({
        error: 'autoId, stazioneId e quantita sono obbligatori'
      });
    }
    
    if (!isValidId(autoId) || !isValidId(stazioneId)) {
      return res.status(400).json({ error: 'ID auto o stazione non validi' });
    }
    
    const auto = await Auto.findById(autoId);
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    
    const stazione = await Stazione.findById(stazioneId);
    if (!stazione) {
      return res.status(404).json({ error: 'Stazione non trovata' });
    }
    
    if (!stazione.aperto) {
      return res.status(400).json({ error: 'Stazione chiusa' });
    }
    
    const prezzo = stazione.prezzi?.[auto.carburanteTipo] || 1.80;
    const costo = quantita * prezzo;
    const valutaUsata = valuta || auto.blockchain || 'MYZ';
    
    if (!stazione.pagamentiAccettati.includes(valutaUsata)) {
      return res.status(400).json({
        error: `Pagamento in ${valutaUsata} non accettato da questa stazione`
      });
    }
    
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    const nuovoLivello = Math.min(
      auto.carburanteAttuale + quantita,
      auto.serbatoioCapacita || 50
    );
    
    auto.carburanteAttuale = nuovoLivello;
    auto.storicoRifornimenti = auto.storicoRifornimenti || [];
    auto.storicoRifornimenti.push({
      data: new Date(),
      quantita,
      costo,
      valuta: valutaUsata,
      stazione: stazione.nome || 'Stazione',
      transactionId,
      blockchain: valutaUsata
    });
    await auto.save();
    
    stazione.transazioniTotali = (stazione.transazioniTotali || 0) + 1;
    stazione.volumeTotale = (stazione.volumeTotale || 0) + costo;
    await stazione.save();
    
    res.json({
      success: true,
      rifornimento: {
        auto: auto.targa || auto._id,
        quantita,
        costo: costo.toFixed(2),
        valuta: valutaUsata,
        transactionId,
        stazione: stazione.nome,
        livelloCarburante: auto.carburanteAttuale,
        autonomia: (auto.carburanteAttuale * 15).toFixed(0) + ' km'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.autoRefill = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID auto non valido' });
    }
    
    const auto = await Auto.findById(req.params.id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    
    if (!auto.preferenze?.rifornimentoAutomatico) {
      return res.status(400).json({
        error: 'Rifornimento automatico disattivato'
      });
    }
    
    if (auto.carburanteAttuale > (auto.preferenze?.sogliaMinima || 10)) {
      return res.json({
        success: true,
        message: 'Carburante sufficiente',
        livello: auto.carburanteAttuale,
        soglia: auto.preferenze?.sogliaMinima || 10
      });
    }
    
    const stazione = await Stazione.findOne({ aperto: true });
    if (!stazione) {
      return res.status(404).json({ error: 'Nessuna stazione disponibile' });
    }
    
    const quantita = (auto.serbatoioCapacita || 50) - auto.carburanteAttuale;
    const costo = quantita * (stazione.prezzi?.[auto.carburanteTipo] || 1.80);
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    auto.carburanteAttuale = auto.serbatoioCapacita || 50;
    auto.storicoRifornimenti = auto.storicoRifornimenti || [];
    auto.storicoRifornimenti.push({
      data: new Date(),
      quantita,
      costo,
      valuta: auto.blockchain || 'MYZ',
      stazione: stazione.nome,
      transactionId,
      blockchain: auto.blockchain || 'MYZ',
      automatico: true
    });
    await auto.save();
    
    res.json({
      success: true,
      message: 'Rifornimento automatico completato',
      rifornimento: {
        quantita,
        costo: costo.toFixed(2),
        valuta: auto.blockchain || 'MYZ',
        transactionId,
        stazione: stazione.nome
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'ID auto non valido' });
    }
    
    const auto = await Auto.findById(req.params.id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto non trovata' });
    }
    
    const storico = auto.storicoRifornimenti || [];
    const totaleRifornimenti = storico.length;
    const totaleCarburante = storico.reduce((sum, r) => sum + (r.quantita || 0), 0);
    const totaleSpeso = storico.reduce((sum, r) => sum + (r.costo || 0), 0);
    
    res.json({
      success: true,
      stats: {
        totaleRifornimenti,
        totaleCarburante: totaleCarburante.toFixed(2),
        totaleSpeso: totaleSpeso.toFixed(2),
        valuta: auto.blockchain || 'MYZ'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
