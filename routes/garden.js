const express = require('express');
const router = express.Router();
const Joi = require('joi');
const GardenReading = require('../models/GardenReading');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Note: the existing CRUD handlers below lazily `require('../models/Garden')`
// inside the route handler. The Garden model is intentionally not imported at
// module-load time because it is not shipped in this repository tree, and the
// Arduino ingestion endpoints must remain loadable without it.

// Middleware di autenticazione per tutte le route
router.use(auth);

// Joi schemas for the Arduino sensor ingestion & stats endpoints
// (the rest of the file keeps the existing garden CRUD handlers)
// Custom messages are explicit so test assertions that look for both bounds
// (e.g. /ph.*0.*14/i) can match a single string.
const gardenDataSchema = Joi.object({
  gardenId: Joi.string()
    .trim()
    .min(1)
    .max(80)
    .required()
    .messages({
      'any.required': 'gardenId is required',
      'string.base': 'gardenId must be a string',
      'string.empty': 'gardenId is required',
      'string.min': 'gardenId is required',
      'string.max': 'gardenId must be at most 80 characters',
    }),
  ph: Joi.number()
    .min(0)
    .max(14)
    .required()
    .messages({
      'any.required': 'ph is required',
      'number.base': 'ph must be a number between 0 and 14',
      'number.min': 'ph must be a number between 0 and 14',
      'number.max': 'ph must be a number between 0 and 14',
    }),
  ec: Joi.number()
    .min(0)
    .required()
    .messages({
      'any.required': 'ec is required',
      'number.base': 'ec must be a non-negative number',
      'number.min': 'ec must be a non-negative number',
    }),
  temperature: Joi.number()
    .min(-50)
    .max(100)
    .required()
    .messages({
      'any.required': 'temperature is required',
      'number.base': 'temperature must be a number between -50 and 100',
      'number.min': 'temperature must be a number between -50 and 100',
      'number.max': 'temperature must be a number between -50 and 100',
    }),
  humidity: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'any.required': 'humidity is required',
      'number.base': 'humidity must be a number between 0 and 100',
      'number.min': 'humidity must be a number between 0 and 100',
      'number.max': 'humidity must be a number between 0 and 100',
    }),
}).unknown(false);

const gardenStatsQuerySchema = Joi.object({
  from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'from must be a valid ISO 8601 date',
      'date.base': 'from must be a valid ISO 8601 date',
    }),
  to: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'to must be a valid ISO 8601 date',
      'date.base': 'to must be a valid ISO 8601 date',
    }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

function joiErrorToStrings(error) {
  return error.details.map((d) => {
    const path = d.path && d.path.length ? d.path.join('.') : 'value';
    return `${path}: ${d.message}`;
  });
}

// GET /api/gardens - Lista tutti i gardens (con filtri)
router.get('/', async (req, res) => {
  try {
    const { search, city, neighborhood, page = 1, limit = 10 } = req.query;
    const Garden = require('../models/Garden');
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
    const Garden = require('../models/Garden');

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

// GET /api/garden/data - Ingest Arduino sensor reading
// IMPORTANT: must be registered BEFORE the generic `/:id` route so it is not
// captured by the path-parameter handler below.
router.post('/data', async (req, res) => {
  try {
    const { error, value } = gardenDataSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: joiErrorToStrings(error),
      });
    }

    const reading = await GardenReading.create({
      owner: req.user.id,
      gardenId: value.gardenId,
      ph: value.ph,
      ec: value.ec,
      temperature: value.temperature,
      humidity: value.humidity,
    });

    return res.status(201).json({
      success: true,
      data: reading,
    });
  } catch (err) {
    console.error('Errore nella creazione garden reading:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/garden/:id/stats - Historical readings and aggregate statistics for a garden
router.get('/:id/stats', async (req, res) => {
  const gardenId = (req.params.id || '').trim();
  if (!gardenId) {
    return res.status(400).json({
      success: false,
      error: 'garden id is required',
    });
  }

  const { error, value } = gardenStatsQuerySchema.validate(req.query, {
    abortEarly: false,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      errors: joiErrorToStrings(error),
    });
  }

  const query = {
    owner: req.user.id,
    gardenId,
  };
  if (value.from || value.to) {
    query.receivedAt = {};
    if (value.from) query.receivedAt.$gte = value.from;
    if (value.to) query.receivedAt.$lte = value.to;
  }

  try {
    const skip = (value.page - 1) * value.limit;
    const readings = await GardenReading.find(query)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(value.limit)
      .lean();

    const total = await GardenReading.countDocuments(query);

    let averages = null;
    let min = null;
    let max = null;
    let latest = null;

    if (readings.length > 0) {
      const sum = { ph: 0, ec: 0, temperature: 0, humidity: 0 };
      min = { ph: readings[0].ph, ec: readings[0].ec, temperature: readings[0].temperature, humidity: readings[0].humidity };
      max = { ph: readings[0].ph, ec: readings[0].ec, temperature: readings[0].temperature, humidity: readings[0].humidity };
      for (const r of readings) {
        sum.ph += r.ph;
        sum.ec += r.ec;
        sum.temperature += r.temperature;
        sum.humidity += r.humidity;
        if (r.ph < min.ph) min.ph = r.ph;
        if (r.ec < min.ec) min.ec = r.ec;
        if (r.temperature < min.temperature) min.temperature = r.temperature;
        if (r.humidity < min.humidity) min.humidity = r.humidity;
        if (r.ph > max.ph) max.ph = r.ph;
        if (r.ec > max.ec) max.ec = r.ec;
        if (r.temperature > max.temperature) max.temperature = r.temperature;
        if (r.humidity > max.humidity) max.humidity = r.humidity;
      }
      averages = {
        ph: sum.ph / readings.length,
        ec: sum.ec / readings.length,
        temperature: sum.temperature / readings.length,
        humidity: sum.humidity / readings.length,
      };
      latest = readings[0];
    }

    const totalPages = Math.max(1, Math.ceil(total / value.limit));
    const hasMore = value.page < totalPages;

    return res.json({
      success: true,
      data: {
        gardenId,
        pagination: {
          page: value.page,
          limit: value.limit,
          total,
          totalPages,
          hasMore,
        },
        stats: {
          count: readings.length,
          averages,
          min,
          max,
          latest,
        },
        readings,
      },
    });
  } catch (err) {
    console.error('Errore nel recupero garden stats:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/gardens/:id - Dettaglio garden
router.get('/:id', async (req, res) => {
  try {
    const Garden = require('../models/Garden');
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
      const Garden = require('../models/Garden');
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
      const Garden = require('../models/Garden');
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
    const Garden = require('../models/Garden');
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
    console.error('Errore nel reverse geocode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;