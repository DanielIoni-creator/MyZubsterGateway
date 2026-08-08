const EvaLunare = require('../models/EvaLunare');
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

// Registra EVA Lunare
exports.registraEva = async (req, res) => {
  try {
    const eva = new EvaLunare({
      ...req.body,
      proprietarioId: getUserId(req)
    });
    await eva.save();
    res.status(201).json({ success: true, eva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista EVA
exports.getEva = async (req, res) => {
  try {
    const eva = await EvaLunare.find({ proprietarioId: getUserId(req) });
    res.json({ success: true, count: eva.length, eva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio EVA
exports.getEvaDetails = async (req, res) => {
  try {
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    res.json({ success: true, eva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna EVA
exports.updateEva = async (req, res) => {
  try {
    const eva = await EvaLunare.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    res.json({ success: true, eva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina EVA
exports.deleteEva = async (req, res) => {
  try {
    await EvaLunare.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'EVA Lunare eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ MISSIONI ============

// Pianifica missione
exports.pianificaMissione = async (req, res) => {
  try {
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    const missione = {
      ...req.body,
      dataInizio: new Date(),
      status: 'pianificata'
    };
    
    eva.missioni.push(missione);
    eva.statistiche.missioniTotali += 1;
    await eva.save();
    
    res.status(201).json({
      success: true,
      missione: eva.missioni[eva.missioni.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Avvia missione
exports.avviaMissione = async (req, res) => {
  try {
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    const missione = eva.missioni.id(req.params.missioneId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.status = 'in_corso';
    eva.stato = 'esplorazione';
    await eva.save();
    
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
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    const missione = eva.missioni.id(req.params.missioneId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    missione.status = 'completata';
    missione.dataFine = new Date();
    missione.risultati = req.body.risultati || 'Missione completata con successo';
    missione.valutazione = req.body.valutazione || 5;
    
    eva.statistiche.missioniCompletate += 1;
    eva.statistiche.kmPercorsi += req.body.km || 0;
    eva.stato = 'attivo';
    
    await eva.save();
    
    // Calcola ricompensa
    const ricompensa = req.body.ricompensa || 1000;
    eva.statistiche.ricaviTotali += ricompensa;
    await eva.save();
    
    res.json({
      success: true,
      missione,
      ricompensa
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ RACCOLTA RISORSE ============

// Raccogli risorsa
exports.raccogliRisorsa = async (req, res) => {
  try {
    const { tipo, quantita, posizione } = req.body;
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    eva.risorse.push({
      tipo,
      quantita,
      unita: 'kg',
      dataRaccolta: new Date(),
      posizione: posizione || eva.posizione.regione
    });
    
    eva.statistiche.risorseRaccolte += quantita;
    await eva.save();
    
    res.json({
      success: true,
      risorsa: eva.risorse[eva.risorse.length - 1]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ STATISTICHE ============

// Statistiche EVA
exports.getStats = async (req, res) => {
  try {
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    res.json({
      success: true,
      stats: {
        missioniTotali: eva.statistiche.missioniTotali,
        missioniCompletate: eva.statistiche.missioniCompletate,
        kmPercorsi: eva.statistiche.kmPercorsi,
        risorseRaccolte: eva.statistiche.risorseRaccolte,
        ricaviTotali: eva.statistiche.ricaviTotali,
        valutazioneMedia: eva.statistiche.valutazioneMedia
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ PAGAMENTI ============

// Paga missione
exports.pagaMissione = async (req, res) => {
  try {
    const eva = await EvaLunare.findById(req.params.id);
    if (!eva) {
      return res.status(404).json({ error: 'EVA Lunare non trovato' });
    }
    
    const missione = eva.missioni.id(req.params.missioneId);
    if (!missione) {
      return res.status(404).json({ error: 'Missione non trovata' });
    }
    
    const importo = req.body.importo || 1000;
    const transactionId = crypto.randomBytes(16).toString('hex');
    
    eva.statistiche.ricaviTotali += importo;
    await eva.save();
    
    res.json({
      success: true,
      pagamento: {
        missione: missione.nome,
        importo,
        valuta: req.body.valuta || 'MYZ',
        transactionId,
        status: 'completato'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
