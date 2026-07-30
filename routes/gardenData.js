const express = require('express');
const auth = require('../middleware/auth');
const GardenData = require('../models/GardenData');

const router = express.Router();

// ─── Validation ─────────────────────────────────────────────

const ALLOWED_METRICS = ['ph', 'ec', 'temperature', 'humidity', 'moisture', 'light', 'co2'];

function parseMetric(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePayload(body) {
  const gardenId = typeof body.gardenId === 'string' ? body.gardenId.trim() : '';
  const errors = [];

  if (!gardenId) errors.push('gardenId is required');
  if (gardenId.length > 80) errors.push('gardenId must be 80 characters or less');

  const readings = {};

  // Required metrics
  const ph = parseMetric(body.ph);
  if (ph === null || ph < 0 || ph > 14) {
    errors.push('ph must be a number between 0 and 14');
  } else {
    readings.ph = ph;
  }

  const ec = parseMetric(body.ec);
  if (ec === null || ec < 0) {
    errors.push('ec must be a non-negative number');
  } else {
    readings.ec = ec;
  }

  const temperature = parseMetric(body.temperature);
  if (temperature === null || temperature < -50 || temperature > 100) {
    errors.push('temperature must be a number between -50 and 100');
  } else {
    readings.temperature = temperature;
  }

  const humidity = parseMetric(body.humidity);
  if (humidity === null || humidity < 0 || humidity > 100) {
    errors.push('humidity must be a number between 0 and 100');
  } else {
    readings.humidity = humidity;
  }

  // Optional metrics
  const moisture = parseMetric(body.moisture);
  if (moisture !== null) {
    if (moisture < 0 || moisture > 100) {
      errors.push('moisture must be between 0 and 100');
    } else {
      readings.moisture = moisture;
    }
  }

  const light = parseMetric(body.light);
  if (light !== null) {
    if (light < 0) {
      errors.push('light must be non-negative');
    } else {
      readings.light = light;
    }
  }

  const co2 = parseMetric(body.co2);
  if (co2 !== null) {
    if (co2 < 0) {
      errors.push('co2 must be non-negative');
    } else {
      readings.co2 = co2;
    }
  }

  return { gardenId, readings, errors };
}

// ─── POST /api/garden/data — Receive sensor data from Arduino ────

router.post('/data', auth, async (req, res, next) => {
  try {
    const { gardenId, readings, errors } = validatePayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const record = new GardenData({
      gardenId,
      ...readings,
      receivedAt: new Date(),
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: 'Sensor data received',
      data: {
        id: record._id,
        gardenId: record.gardenId,
        ...readings,
        receivedAt: record.receivedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/garden/data — Retrieve sensor data ────

router.get('/data', async (req, res, next) => {
  try {
    const { gardenId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (gardenId) filter.gardenId = gardenId;

    const records = await GardenData.find(filter)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GardenData.countDocuments(filter);

    res.json({
      success: true,
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/garden/data/latest — Latest reading for a garden ────

router.get('/data/latest', async (req, res, next) => {
  try {
    const { gardenId } = req.query;
    if (!gardenId) {
      return res.status(400).json({ success: false, message: 'gardenId is required' });
    }

    const latest = await GardenData.findOne({ gardenId }).sort({ receivedAt: -1 });
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No data found for this garden' });
    }

    res.json({ success: true, data: latest });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/garden/data/summary — Aggregated stats ────

router.get('/data/summary', async (req, res, next) => {
  try {
    const { gardenId, hours } = req.query;
    if (!gardenId) {
      return res.status(400).json({ success: false, message: 'gardenId is required' });
    }

    const hoursBack = Math.min(720, Math.max(1, parseInt(hours) || 24));
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const records = await GardenData.find({
      gardenId,
      receivedAt: { $gte: since },
    }).sort({ receivedAt: 1 });

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          gardenId,
          count: 0,
          averages: null,
          min: null,
          max: null,
          latest: null,
        },
      });
    }

    const metrics = ['ph', 'ec', 'temperature', 'humidity', 'moisture', 'light', 'co2'];
    const averages = {};
    const min = {};
    const max = {};

    for (const m of metrics) {
      const values = records.map((r) => r[m]).filter((v) => v !== null && v !== undefined);
      if (values.length > 0) {
        averages[m] = values.reduce((a, b) => a + b, 0) / values.length;
        min[m] = Math.min(...values);
        max[m] = Math.max(...values);
      }
    }

    res.json({
      success: true,
      data: {
        gardenId,
        count: records.length,
        period: `${hoursBack}h`,
        averages,
        min,
        max,
        latest: records[records.length - 1],
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;