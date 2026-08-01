// routes/garden.js
const express = require('express');
const router = express.Router();
const GardenData = require('../models/GardenData');
const { authenticate } = require('../middleware/auth');

// POST /api/garden/data - Ingest Arduino sensor data (pH, EC, temperature, humidity)
router.post('/data', authenticate, async (req, res) => {
  try {
    const { gardenId, pH, EC, temperature, humidity, timestamp } = req.body;

    const targetGardenId = gardenId || req.user.id;

    if (pH === undefined || EC === undefined || temperature === undefined || humidity === undefined) {
      return res.status(400).json({
        error: 'Missing required sensor fields. Please provide pH, EC, temperature, and humidity.'
      });
    }

    const sensorReading = new GardenData({
      gardenId: targetGardenId,
      pH: Number(pH),
      EC: Number(EC),
      temperature: Number(temperature),
      humidity: Number(humidity),
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await sensorReading.save();

    res.status(201).json({
      success: true,
      message: 'Sensor data recorded successfully',
      data: sensorReading
    });
  } catch (error) {
    console.error('Error saving garden sensor data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/garden/:id/stats - Historical data and statistics for a garden
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const gardenId = req.params.id;
    const { limit = 50, startDate, endDate } = req.query;

    const query = { gardenId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await GardenData.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    if (readings.length === 0) {
      return res.json({
        gardenId,
        totalReadings: 0,
        stats: null,
        history: []
      });
    }

    const totalReadings = readings.length;

    const stats = readings.reduce((acc, curr) => {
      acc.sumpH += curr.pH;
      acc.sumEC += curr.EC;
      acc.sumTemp += curr.temperature;
      acc.sumHum += curr.humidity;

      acc.minpH = Math.min(acc.minpH, curr.pH);
      acc.maxpH = Math.max(acc.maxpH, curr.pH);

      acc.minEC = Math.min(acc.minEC, curr.EC);
      acc.maxEC = Math.max(acc.maxEC, curr.EC);

      acc.minTemp = Math.min(acc.minTemp, curr.temperature);
      acc.maxTemp = Math.max(acc.maxTemp, curr.temperature);

      acc.minHum = Math.min(acc.minHum, curr.humidity);
      acc.maxHum = Math.max(acc.maxHum, curr.humidity);

      return acc;
    }, {
      sumpH: 0, sumEC: 0, sumTemp: 0, sumHum: 0,
      minpH: Infinity, maxpH: -Infinity,
      minEC: Infinity, maxEC: -Infinity,
      minTemp: Infinity, maxTemp: -Infinity,
      minHum: Infinity, maxHum: -Infinity
    });

    const averageStats = {
      pH: {
        avg: parseFloat((stats.sumpH / totalReadings).toFixed(2)),
        min: stats.minpH,
        max: stats.maxpH
      },
      EC: {
        avg: parseFloat((stats.sumEC / totalReadings).toFixed(2)),
        min: stats.minEC,
        max: stats.maxEC
      },
      temperature: {
        avg: parseFloat((stats.sumTemp / totalReadings).toFixed(2)),
        min: stats.minTemp,
        max: stats.maxTemp
      },
      humidity: {
        avg: parseFloat((stats.sumHum / totalReadings).toFixed(2)),
        min: stats.minHum,
        max: stats.maxHum
      }
    };

    res.json({
      gardenId,
      totalReadings,
      latestReading: readings[0],
      stats: averageStats,
      history: readings
    });
  } catch (error) {
    console.error('Error fetching garden stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
