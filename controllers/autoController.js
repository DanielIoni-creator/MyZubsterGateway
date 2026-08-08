const Auto = require('../models/Auto');
const Stazione = require('../models/Stazione');
const crypto = require('crypto');

exports.registraAuto = async (req, res) => {
  try {
    const auto = new Auto({ ...req.body, proprietarioId: req.user._id });
    await auto.save();
    res.status(201).json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAuto = async (req, res) => {
  try {
    const auto = await Auto.find({ proprietarioId: req.user._id });
    res.json({ success: true, count: auto.length, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAutoDetails = async (req, res) => {
  try {
    const auto = await Auto.findOne({ _id: req.params.id, proprietarioId: req.user._id });
    if (!auto) return res.status(404).json({ error: 'Auto non trovata' });
    res.json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAuto = async (req, res) => {
  try {
    const auto = await Auto.findOneAndUpdate(
      { _id: req.params.id, proprietarioId: req.user._id },
      req.body,
      { new: true }
    );
    if (!auto) return res.status(404).json({ error: 'Auto non trovata' });
    res.json({ success: true, auto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAuto = async (req, res) => {
  try {
    await Auto.findOneAndDelete({ _id: req.params.id, proprietarioId: req.user._id });
    res.json({ success: true, message: 'Auto eliminata' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rifornisci = async (req, res) => {
  try {
    const { autoId, stazioneId, quantita, valuta } = req.body;
    
    const auto = await Auto.findOne({ _id: autoId, proprietarioId: req.user._id });
    if (!auto) return res.status(404).json({ error: 'Auto non trovata' });
    
    const stazione = await Stazione.findById(stazioneId);
    if (!stazione) return res.status(404).json({ error: 'Stazione non trovata' });
    
    const costo = quantita * stazione.prezzi[auto.carburanteTipo];
    const valutaUsata = valuta || auto.blockchain;
    
    if (!stazione.pagamentiAccettati.includes(valutaUsata)) {
      return res.status(400).json({ error: `Pagamento in ${valutaUsata} non accettato` });
    }
    
    const transactionId = crypto.randomBytes(32).toString('hex');
    
    auto.carburanteAttuale = Math.min(auto.carburanteAttuale + quantita, auto.serbatoioCapacita);
    auto.storicoRifornimenti.push({
      data: new Date(),
      quantita,
      costo,
      valuta: valutaUsata,
      stazione: stazione.nome,
      transactionId,
      blockchain: valutaUsata
    });
    await auto.save();
    
    stazione.transazioniTotali += 1;
    stazione.volumeTotale += costo;
    if (stazione.carburanteDisponibile) {
      stazione.carburanteDisponibile[auto.carburanteTipo] -= quantita;
    }
    await stazione.save();
    
    res.json({
      success: true,
      rifornimento: {
        auto: auto.targa,
        quantita,
        costo,
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
    const auto = await Auto.findOne({ _id: req.params.id, proprietarioId: req.user._id });
    if (!auto) return res.status(404).json({ error: 'Auto non trovata' });
    
    if (!auto.preferenze.rifornimentoAutomatico) {
      return res.status(400).json({ error: 'Rifornimento automatico disattivato' });
    }
    
    if (auto.carburanteAttuale > auto.preferenze.sogliaMinima) {
      return res.json({ success: true, message: 'Carburante sufficiente', livello: auto.carburanteAttuale });
    }
    
    const stazione = await Stazione.findOne({ aperto: true });
    if (!stazione) return res.status(404).json({ error: 'Nessuna stazione disponibile' });
    
    const quantita = auto.serbatoioCapacita - auto.carburanteAttuale;
    const costo = quantita * stazione.prezzi[auto.carburanteTipo];
    const transactionId = crypto.randomBytes(32).toString('hex');
    
    auto.carburanteAttuale = auto.serbatoioCapacita;
    auto.storicoRifornimenti.push({
      data: new Date(),
      quantita,
      costo,
      valuta: auto.blockchain,
      stazione: stazione.nome,
      transactionId,
      blockchain: auto.blockchain,
      automatico: true
    });
    await auto.save();
    
    res.json({
      success: true,
      message: 'Rifornimento automatico completato',
      rifornimento: { quantita, costo, valuta: auto.blockchain, transactionId, stazione: stazione.nome }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const auto = await Auto.findOne({ _id: req.params.id, proprietarioId: req.user._id });
    if (!auto) return res.status(404).json({ error: 'Auto non trovata' });
    
    const totaleRifornimenti = auto.storicoRifornimenti.length;
    const totaleCarburante = auto.storicoRifornimenti.reduce((sum, r) => sum + r.quantita, 0);
    const totaleSpeso = auto.storicoRifornimenti.reduce((sum, r) => sum + r.costo, 0);
    
    res.json({
      success: true,
      stats: {
        totaleRifornimenti,
        totaleCarburante: totaleCarburante.toFixed(2),
        totaleSpeso: totaleSpeso.toFixed(2),
        valuta: auto.blockchain
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
