const CentroControllo = require('../models/CentroControllo');

// Crea centro di controllo
exports.creaCentro = async (req, res) => {
  try {
    const centro = new CentroControllo(req.body);
    await centro.save();
    res.status(201).json({ success: true, centro });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lista centri
exports.getCentri = async (req, res) => {
  try {
    const centri = await CentroControllo.find();
    res.json({ success: true, count: centri.length, centri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dettaglio centro
exports.getCentro = async (req, res) => {
  try {
    const centro = await CentroControllo.findById(req.params.id);
    if (!centro) {
      return res.status(404).json({ error: 'Centro non trovato' });
    }
    res.json({ success: true, centro });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna prezzi
exports.updatePrezzi = async (req, res) => {
  try {
    const centro = await CentroControllo.findByIdAndUpdate(
      req.params.id,
      { prezzi: req.body },
      { new: true }
    );
    if (!centro) {
      return res.status(404).json({ error: 'Centro non trovato' });
    }
    res.json({ success: true, centro });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
