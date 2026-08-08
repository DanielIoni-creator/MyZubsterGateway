const express = require('express');
const router = express.Router();

const observations = [];

// POST /api/fauna/observe - Registra osservazione
router.post('/observe', (req, res) => {
  const { gardenId, species, date, notes } = req.body;
  if (!gardenId || !species || !Array.isArray(species)) {
    return res.status(400).json({ error: 'gardenId and species array are required' });
  }

  const observation = {
    id: `obs_${Date.now()}`,
    gardenId,
    species,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date(),
  };

  observations.push(observation);
  res.status(201).json({ success: true, observation });
});

// GET /api/fauna/stats - Statistiche fauna
router.get('/stats', (req, res) => {
  const totalObservations = observations.length;
  const totalSpeciesCount = observations.reduce((acc, obs) => {
    return acc + obs.species.reduce((sAcc, s) => sAcc + (s.count || 0), 0);
  }, 0);

  res.json({
    totalObservations,
    totalSpeciesCount,
    activeGardensCount: new Set(observations.map(o => o.gardenId)).size,
  });
});

// GET /api/fauna/species - Lista specie rilevate
router.get('/species', (req, res) => {
  const speciesMap = {};
  observations.forEach(obs => {
    obs.species.forEach(s => {
      if (!speciesMap[s.name]) {
        speciesMap[s.name] = { name: s.name, type: s.type, totalCount: 0 };
      }
      speciesMap[s.name].totalCount += s.count || 0;
    });
  });

  res.json({ species: Object.values(speciesMap) });
});

// GET /api/fauna/garden/:id - Dati fauna per orto
router.get('/garden/:id', (req, res) => {
  const { id } = req.params;
  const gardenObs = observations.filter(o => o.gardenId === id);
  res.json({ gardenId: id, observations: gardenObs });
});

// GET /api/fauna/recommendations - Raccomandazioni per biodiversita
router.get('/recommendations', (req, res) => {
  res.json({
    recommendations: [
      { id: 1, title: 'Piantare fiori meliferi', description: 'Favorisce la presenza di api e impollinatori' },
      { id: 2, title: 'Installare casette per uccelli', description: 'Attira volatili insettivori per controllo biologico' }
    ]
  });
});

// GET /api/fauna/trends - Andamento specie nel tempo
router.get('/trends', (req, res) => {
  res.json({ trends: observations.map(o => ({ date: o.date, totalCount: o.species.reduce((a, b) => a + b.count, 0) })) });
});

module.exports = router;
