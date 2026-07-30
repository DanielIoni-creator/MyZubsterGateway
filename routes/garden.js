const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const GardenReading = require('../models/GardenReading');

const router = express.Router();

const METRICS = ['ph', 'ec', 'temperature', 'humidity'];

// ---------------------------------------------------------------------------
// Joi schemas
// ---------------------------------------------------------------------------

const GARDEN_ID_MAX = 80;
const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 100;
const LIMIT_MAX = 500;

const postDataSchema = Joi.object({
  gardenId: Joi.string()
    .trim()
    .min(1)
    .max(GARDEN_ID_MAX)
    .required()
    .messages({
      'string.empty': 'gardenId is required',
      'string.max': `gardenId must be ${GARDEN_ID_MAX} characters or less`,
      'any.required': 'gardenId is required',
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
      'number.min': 'ec must be a non-negative number',
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

const statsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(PAGE_DEFAULT),
  limit: Joi.number().integer().min(1).max(LIMIT_MAX).default(LIMIT_DEFAULT),
  from: Joi.date().iso().messages({
    'date.format': 'from must be a valid ISO date',
  }),
  to: Joi.date().iso().messages({
    'date.format': 'to must be a valid ISO date',
  }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPublicReading(reading) {
  return {
    id: reading._id,
    gardenId: reading.gardenId,
    ph: reading.ph,
    ec: reading.ec,
    temperature: reading.temperature,
    humidity: reading.humidity,
    receivedAt: reading.receivedAt,
  };
}

function summarizeReadings(readings) {
  const summary = {
    count: readings.length,
    latest: readings[0] ? toPublicReading(readings[0]) : null,
    averages: {},
    min: {},
    max: {},
  };

  for (const metric of METRICS) {
    const values = readings
      .map((r) => Number(r[metric]))
      .filter((v) => Number.isFinite(v));

    if (!values.length) {
      summary.averages[metric] = null;
      summary.min[metric] = null;
      summary.max[metric] = null;
      continue;
    }

    const total = values.reduce((s, v) => s + v, 0);
    summary.averages[metric] = Number((total / values.length).toFixed(3));
    summary.min[metric] = Math.min(...values);
    summary.max[metric] = Math.max(...values);
  }

  return summary;
}

function buildDateFilter(from, to) {
  const receivedAt = {};
  if (from) receivedAt.$gte = new Date(from);
  if (to) receivedAt.$lte = new Date(to);
  return Object.keys(receivedAt).length ? { receivedAt } : {};
}

function formatJoiError(err) {
  return err.details.map((d) => d.message);
}

// ---------------------------------------------------------------------------
// POST /api/garden/data — ingest sensor reading
// ---------------------------------------------------------------------------

router.post('/data', auth, async (req, res) => {
  try {
    const { error, value } = postDataSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: formatJoiError(error),
      });
    }

    const reading = await GardenReading.create({
      owner: req.user._id,
      gardenId: value.gardenId,
      ph: value.ph,
      ec: value.ec,
      temperature: value.temperature,
      humidity: value.humidity,
    });

    return res.status(201).json({
      success: true,
      data: toPublicReading(reading),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/garden/:id/stats — historical data + summary statistics
// ---------------------------------------------------------------------------

router.get('/:id/stats', auth, async (req, res) => {
  try {
    const gardenId = String(req.params.id || '').trim();
    if (!gardenId) {
      return res.status(400).json({
        success: false,
        error: 'garden id is required',
      });
    }

    const { error: qsError, value: qs } = statsQuerySchema.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    if (qsError) {
      return res.status(400).json({
        success: false,
        errors: formatJoiError(qsError),
      });
    }

    const { page, limit } = qs;
    const dateFilter = buildDateFilter(qs.from, qs.to);
    const filter = { owner: req.user._id, gardenId, ...dateFilter };

    const [total, readings] = await Promise.all([
      GardenReading.countDocuments(filter),
      GardenReading.find(filter)
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      data: {
        gardenId,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
        stats: summarizeReadings(readings),
        readings: readings.map(toPublicReading),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
