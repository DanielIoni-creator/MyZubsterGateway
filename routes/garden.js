const express = require('express');
const auth = require('../middleware/auth');
const GardenReading = require('../models/GardenReading');

const router = express.Router();

const METRICS = ['ph', 'ec', 'temperature', 'humidity'];

function parseMetric(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePayload(body) {
  const gardenId = typeof body.gardenId === 'string' ? body.gardenId.trim() : '';
  const readings = {
    ph: parseMetric(body.ph),
    ec: parseMetric(body.ec),
    temperature: parseMetric(body.temperature),
    humidity: parseMetric(body.humidity),
  };
  const errors = [];

  if (!gardenId) errors.push('gardenId is required');
  if (gardenId.length > 80) errors.push('gardenId must be 80 characters or less');

  if (readings.ph === null || readings.ph < 0 || readings.ph > 14) {
    errors.push('ph must be a number between 0 and 14');
  }
  if (readings.ec === null || readings.ec < 0) {
    errors.push('ec must be a non-negative number');
  }
  if (readings.temperature === null || readings.temperature < -50 || readings.temperature > 100) {
    errors.push('temperature must be a number between -50 and 100');
  }
  if (readings.humidity === null || readings.humidity < 0 || readings.humidity > 100) {
    errors.push('humidity must be a number between 0 and 100');
  }

  return { gardenId, readings, errors };
}

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
      .map((reading) => Number(reading[metric]))
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      summary.averages[metric] = null;
      summary.min[metric] = null;
      summary.max[metric] = null;
      continue;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    summary.averages[metric] = Number((total / values.length).toFixed(3));
    summary.min[metric] = Math.min(...values);
    summary.max[metric] = Math.max(...values);
  }

  return summary;
}

function buildDateFilter(query) {
  const receivedAt = {};

  if (query.from) {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) {
      return { error: 'from must be a valid date' };
    }
    receivedAt.$gte = from;
  }

  if (query.to) {
    const to = new Date(query.to);
    if (Number.isNaN(to.getTime())) {
      return { error: 'to must be a valid date' };
    }
    receivedAt.$lte = to;
  }

  return Object.keys(receivedAt).length ? { receivedAt } : {};
}

router.post('/data', auth, async (req, res) => {
  try {
    const { gardenId, readings, errors } = validatePayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const reading = await GardenReading.create({
      owner: req.user._id,
      gardenId,
      ...readings,
    });

    return res.status(201).json({
      success: true,
      data: toPublicReading(reading),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/stats', auth, async (req, res) => {
  try {
    const gardenId = String(req.params.id || '').trim();
    if (!gardenId) {
      return res.status(400).json({ success: false, error: 'garden id is required' });
    }

    const dateFilter = buildDateFilter(req.query);
    if (dateFilter.error) {
      return res.status(400).json({ success: false, error: dateFilter.error });
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    const filter = {
      owner: req.user._id,
      gardenId,
      ...dateFilter,
    };

    const readings = await GardenReading.find(filter)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: {
        gardenId,
        stats: summarizeReadings(readings),
        readings: readings.map(toPublicReading),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
