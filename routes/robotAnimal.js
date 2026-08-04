const express = require('express');
const router = express.Router();
const animal = require('../robot_animal_assistance');
const robotBrain = require('../robot_brain');

// Segnala un animale
router.post('/report', async (req, res) => {
  try {
    const {
      reportId,
      clientId,
      robotId,
      animalType,
      location,
      description,
      severity,
      photoUrl,
      amount,
      currency
    } = req.body;

    if (!reportId || !clientId || !robotId || !animalType || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await animal.reportAnimal({
      reportId,
      clientId,
      robotId,
      animalType,
      location,
      description,
      severity,
      photoUrl,
      amount: amount || 50,
      currency: currency || 'MYZ'
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assegna robot a segnalazione
router.post('/assign', async (req, res) => {
  try {
    const { reportId, robotId } = req.body;
    if (!reportId || !robotId) {
      return res.status(400).json({ error: 'Missing reportId or robotId' });
    }

    const result = await animal.assignRobot(reportId, robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inizia soccorso
router.post('/start', async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) return res.status(400).json({ error: 'Missing reportId' });

    const result = await animal.startRescue(reportId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Completa salvataggio
router.post('/complete', async (req, res) => {
  try {
    const { reportId, notes } = req.body;
    if (!reportId) return res.status(400).json({ error: 'Missing reportId' });

    const result = await animal.completeRescue(reportId, notes);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallisce salvataggio
router.post('/fail', async (req, res) => {
  try {
    const { reportId, reason } = req.body;
    if (!reportId) return res.status(400).json({ error: 'Missing reportId' });

    const result = await animal.failRescue(reportId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggiungi nota
router.post('/note', async (req, res) => {
  try {
    const { reportId, note } = req.body;
    if (!reportId || !note) {
      return res.status(400).json({ error: 'Missing reportId or note' });
    }

    const result = await animal.addNote(reportId, note);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ottieni stato segnalazione
router.get('/report/:reportId', (req, res) => {
  try {
    const result = animal.getReport(req.params.reportId);
    if (!result) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista segnalazioni attive
router.get('/active', (req, res) => {
  try {
    const result = animal.listActiveReports();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Statistiche
router.get('/stats', (req, res) => {
  try {
    const result = animal.getStats();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
