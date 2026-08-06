// routes/sensors.js - Route per sensori Arduino
const express = require('express');
const router = express.Router();
const sensorService = require('../services/sensorService');

// Ricevi dati dai sensori
router.post('/data', async (req, res) => {
  try {
    const data = await sensorService.receiveSensorData(req.body);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Ottieni dati per un orto
router.get('/garden/:gardenId', async (req, res) => {
  try {
    const { gardenId } = req.params;
    const { days = 7 } = req.query;
    
    const data = await sensorService.getGardenData(gardenId, parseInt(days));
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ottieni ultimo dato per un orto
router.get('/garden/:gardenId/latest', async (req, res) => {
  try {
    const { gardenId } = req.params;
    const data = await sensorService.getLatestData(gardenId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ottieni statistiche per un orto
router.get('/garden/:gardenId/stats', async (req, res) => {
  try {
    const { gardenId } = req.params;
    const stats = await sensorService.getGardenStats(gardenId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
