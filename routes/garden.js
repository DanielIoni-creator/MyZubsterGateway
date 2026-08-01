const express = require('express');
const router = express.Router();
const Joi = require('joi');
const GardenReading = require('../models/GardenReading');
const auth = require('../middleware/auth');

// Middleware di autenticazione per tutte le route
router.use(auth);

// ---------------------------------------------------------------------------
// POST /api/garden/data — Arduino sensor data ingestion
// ---------------------------------------------------------------------------
const readingSchema = Joi.object({
  gardenId: Joi.string().trim().min(1).max(80).required()
    .messages({
      'string.min': 'gardenId must be between 1 and 80 characters',
      'string.max': 'gardenId must be between 1 and 80 characters',
      'any.required': 'gardenId is required',
      'string.empty': 'gardenId is required',
    }),
  ph: Joi.number().min(0).max(14).required()
    .messages({
      'number.base': 'ph must be a number',
      'number.min': 'ph must be between 0 and 14',
      'number.max': 'ph must be between 0 and 14',
      'any.required': 'ph is required',
    }),
  ec: Joi.number().min(0).required()
    .messages({
      'number.base': 'ec must be a number',
      'number.min': 'ec must be non-negative',
      'any.required': 'ec is required',
    }),
  temperature: Joi.number().min(-50).max(100).required()
    .messages({
      'number.base': 'temperature must be a number',
      'number.min': 'temperature must be between -50 and 100',
      'number.max': 'temperature must be between -50 and 100',
      'any.required': 'temperature is required',
    }),
  humidity: Joi.number().min(0).max(100).required()
    .messages({
      'number.base': 'humidity must be a number',
      'number.min': 'humidity must be between 0 and 100',
      'number.max': 'humidity must be between 0 and 100',
      'any.required': 'humidity is required',
    }),
});

router.post('/data', async (req, res) => {
  const { error, value } = readingSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((d) => d.message),
    });
  }

  try {
    const { gardenId, ph, ec, temperature, humidity } = value;

    const reading = await GardenReading.create({
      owner: req.user.id,
      gardenId,
      ph,
      ec,
      temperature,
      humidity,
    });

    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    console.error('Errore nell\'inserimento lettura garden:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/garden/:id/stats — historical data & statistics
// ---------------------------------------------------------------------------
const statsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(100),
  from: Joi.date().iso().messages({
    'date.base': 'from must be a valid ISO 8601 date',
    'date.format': 'from must be a valid ISO 8601 date',
  }),
  to: Joi.date().iso().messages({
    'date.base': 'to must be a valid ISO 8601 date',
    'date.format': 'to must be a valid ISO 8601 date',
  }),
});

router.get('/:id/stats', async (req, res) => {
  const gardenId = req.params.id ? req.params.id.trim() : '';

  if (!gardenId) {
    return res.status(400).json({ success: false, error: 'garden id is required' });
  }

  const { error, value } = statsQuerySchema.validate(req.query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((d) => d.message),
    });
  }

  const { page, limit, from, to } = value;
  const skip = (page - 1) * limit;

  const query = { gardenId };

  if (from || to) {
    query.receivedAt = {};
    if (from) {
      query.receivedAt.$gte = from;
    }
    if (to) {
      query.receivedAt.$lte = to;
    }
  }

  try {
    const readings = await GardenReading.find(query)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await GardenReading.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const stats = {
      count: total,
      averages: null,
      min: null,
      max: null,
      latest: readings.length > 0 ? readings[0] : null,
    };

    if (total > 0) {
      const allReadings = await GardenReading.find(query).lean();
      const phValues = allReadings.map((r) => r.ph);
      const ecValues = allReadings.map((r) => r.ec);
      const tempValues = allReadings.map((r) => r.temperature);
      const humValues = allReadings.map((r) => r.humidity);

      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

      stats.averages = {
        ph: parseFloat(avg(phValues).toFixed(2)),
        ec: parseFloat(avg(ecValues).toFixed(2)),
        temperature: parseFloat(avg(tempValues).toFixed(2)),
        humidity: parseFloat(avg(humValues).toFixed(2)),
      };
      stats.min = {
        ph: Math.min(...phValues),
        ec: Math.min(...ecValues),
        temperature: Math.min(...tempValues),
        humidity: Math.min(...humValues),
      };
      stats.max = {
        ph: Math.max(...phValues),
        ec: Math.max(...ecValues),
        temperature: Math.max(...tempValues),
        humidity: Math.max(...humValues),
      };
    }

    res.json({
      success: true,
      data: {
        stats,
        readings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (err) {
    console.error('Errore nel recupero stats garden:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
