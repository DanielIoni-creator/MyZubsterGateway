const Stazione = require('../models/Stazione');

exports.creaStazione = async (req, res) => {
  try {
    const stazione = new Stazione(req.body);
    await stazione.save();
    res.status(201).json({ success: true, stazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStazioni = async (req, res) => {
  try {
    const stazioni = await Stazione.find();
    res.json({ success: true, count: stazioni.length, stazioni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStazioneVicina = async (req, res) => {
  try {
    const stazioni = await Stazione.find({ aperto: true });
    res.json({ success: true, stazioni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePrezzi = async (req, res) => {
  try {
    const stazione = await Stazione.findByIdAndUpdate(
      req.params.id,
      { prezzi: req.body },
      { new: true }
    );
    if (!stazione) return res.status(404).json({ error: 'Stazione non trovata' });
    res.json({ success: true, stazione });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
