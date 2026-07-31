const express = require('express');
const router = express.Router();
const Garden = require('../models/Garden');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware di autenticazione per tutte le route
router.use(auth);

// GET /api/gardens - Lista tutti i gardens (con filtri)
router.get('/', async (req, res) => {
  try {
    const { search, city, neighborhood, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (neighborhood) {
      query.neighborhood = { $regex: neighborhood, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const gardens = await Garden.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Garden.countDocuments(query);

    res.json({
      success: true,
      data: gardens,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Errore nel recupero gardens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gardens/near - Cerca gardens vicino a coordinate
router.get('/near', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat e lng sono richiesti'
      });
    }

    const gardens = await Garden.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius)
        }
      }
    });

    res.json({
      success: true,
      data: gardens,
      count: gardens.length
    });
  } catch (error) {
    console.error('Errore nella ricerca near:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gardens/:id - Dettaglio garden
router.get('/:id', async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) {
      return res.status(404).json({ success: false, error: 'Garden not found' });
    }
    res.json({ success: true, data: garden });
  } catch (error) {
    console.error('Errore nel recupero garden:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gardens - Crea nuovo garden
router.post('/',
  [
    body('name').notEmpty().withMessage('Nome richiesto'),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('neighborhood').optional().isString()
  ],
  async (req, res) => {
    // Validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, description, address, city, neighborhood, location } = req.body;

      const garden = new Garden({
        name,
        description,
        address,
        city,
        neighborhood,
        location: location || { type: 'Point', coordinates: [0, 0] },
        ownerId: req.user.id
      });

      await garden.save();
      res.status(201).json({ success: true, data: garden });
    } catch (error) {
      console.error('Errore nella creazione garden:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/gardens/:id - Aggiorna garden
router.put('/:id',
  [
    body('name').optional().notEmpty().withMessage('Nome non può essere vuoto'),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('neighborhood').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const garden = await Garden.findById(req.params.id);
      if (!garden) {
        return res.status(404).json({ success: false, error: 'Garden not found' });
      }

      // Verifica permessi
      if (garden.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Non autorizzato' });
      }

      const { name, description, address, city, neighborhood, location } = req.body;

      garden.name = name || garden.name;
      garden.description = description || garden.description;
      garden.address = address || garden.address;
      garden.city = city || garden.city;
      garden.neighborhood = neighborhood || garden.neighborhood;
      if (location) {
        garden.location = location;
      }

      await garden.save();
      res.json({ success: true, data: garden });
    } catch (error) {
      console.error('Errore nell\'aggiornamento garden:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/gardens/:id - Elimina garden
router.delete('/:id', async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) {
      return res.status(404).json({ success: false, error: 'Garden not found' });
    }

    // Verifica permessi
    if (garden.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    await Garden.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Garden deleted successfully' });
  } catch (error) {
    console.error('Errore nell\'eliminazione garden:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gardens/reverse-geocode - Coordinate to address
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng are required' });
    }

    const geocoding = require('../services/geocoding');
    const result = await geocoding.reverseGeocode(lat, lng);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Errore nel reverse geocoding:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
