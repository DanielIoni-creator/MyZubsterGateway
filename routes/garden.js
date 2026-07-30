const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GardenReading = require('../models/GardenReading');
const { body, query, param, validationResult } = require('express-validator');

/**
 * POST /api/garden/data
 * Receive sensor data from Arduino IoT devices
 * Requires JWT authentication for registered gardens
 * Closes #96
 */
router.post('/data', [
  auth,
  body('gardenId').isString().notEmpty().withMessage('gardenId is required'),
  body('ph').optional().isFloat({ min: 0, max: 14 }).withMessage('pH must be 0-14'),
  body('ec').optional().isFloat({ min: 0 }).withMessage('EC must be >= 0'),
  body('temperature').optional().isFloat().withMessage('Temperature must be a number'),
  body('humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('Humidity must be 0-100'),
  body('soilMoisture').optional().isFloat({ min: 0, max: 100 }),
  body('lightLevel').optional().isFloat({ min: 0 }),
  body('deviceId').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gardenId, ph, ec, temperature, humidity, soilMoisture, lightLevel, deviceId } = req.body;

    const reading = new GardenReading({
      gardenId,
      ph,
      ec,
      temperature,
      humidity,
      soilMoisture,
      lightLevel,
      deviceId,
      rawPayload: req.body,
      createdAt: new Date()
    });

    await reading.save();

    res.status(201).json({
      success: true,
      reading: {
        id: reading._id,
        gardenId: reading.gardenId,
        ph: reading.ph,
        ec: reading.ec,
        temperature: reading.temperature,
        humidity: reading.humidity,
        createdAt: reading.createdAt
      }
    });
  } catch (error) {
    console.error('[Garden] Data ingestion error:', error.message);
    res.status(500).json({ error: 'Failed to store garden reading' });
  }
});

/**
 * GET /api/garden/:id/stats
 * Retrieve historical sensor data with optional time range
 */
router.get('/:id/stats', [
  auth,
  param('id').isString().notEmpty(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { from, to, limit = 100 } = req.query;

    const filter = { gardenId: id };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const readings = await GardenReading.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-rawPayload -__v')
      .lean();

    // Calculate aggregate stats
    const stats = {};
    if (readings.length > 0) {
      const values = {
        ph: readings.filter(r => r.ph != null).map(r => r.ph),
        ec: readings.filter(r => r.ec != null).map(r => r.ec),
        temperature: readings.filter(r => r.temperature != null).map(r => r.temperature),
        humidity: readings.filter(r => r.humidity != null).map(r => r.humidity),
      };

      const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      const min = arr => arr.length ? Math.min(...arr) : null;
      const max = arr => arr.length ? Math.max(...arr) : null;
      const latest = arr => arr.length ? arr[0] : null;

      stats.ph = { latest: latest(values.ph), avg: avg(values.ph), min: min(values.ph), max: max(values.ph), count: values.ph.length };
      stats.ec = { latest: latest(values.ec), avg: avg(values.ec), min: min(values.ec), max: max(values.ec), count: values.ec.length };
      stats.temperature = { latest: latest(values.temperature), avg: avg(values.temperature), min: min(values.temperature), max: max(values.temperature), count: values.temperature.length };
      stats.humidity = { latest: latest(values.humidity), avg: avg(values.humidity), min: min(values.humidity), max: max(values.humidity), count: values.humidity.length };
    }

    res.json({
      gardenId: id,
      totalReadings: readings.length,
      stats,
      readings,
      period: { from: from || 'beginning', to: to || 'now' }
    });
  } catch (error) {
    console.error('[Garden] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve garden stats' });
  }
});

module.exports = router;
