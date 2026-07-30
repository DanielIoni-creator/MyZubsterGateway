- const express = require('express');
- const router = express.Router();
+const express = require('express');
+const router = express.Router();
+const gardenSchema = require('../models/Garden');
+const gardenStatsSchema = require('../models/GardenStats');

// Endpoint per ricevere dati dagli sensori dell'orto
router.post('/api/garden/data', async (req, res, next) => {
  // Validazione payload
  const errors = validate(req.body);
  if (errors) {
    return res.status(400).json({ errors: errors.details });
  }

  // Salva i dati in MongoDB
  const gardenId = req.body.gardenId;
  const gardenData = {
    gardenId,
    ph: req.body.ph,
    ec: req.body.ec,
    temperature: req.body.temperature,
    humidity: req.body.humidity,
  };

  try {
    const garden = await gardenSchema.findByIdAndUpdate(
      gardenId,
      { $push: { data: gardenData } },
      { new: true }
    );
    res.json(garden);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Endpoint per recuperare dati storici
router.get('/api/garden/:id/stats', async (req, res, next) => {
  const gardenId = req.params.id;
  try {
    const garden = await gardenSchema.findById(gardenId);
    const stats = aggregateGardenStats(garden.data);
    res.json(stats);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Middleware di autenticazione (JWT)
router.use((req, res, next) => {
  // Implementare verifica JWT in base alle esigenze di sicurezza
  next();
});

module.exports = router;
