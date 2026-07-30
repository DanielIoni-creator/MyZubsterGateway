const express = require('express');
const router = express.Router();
const GardenReading = require('../models/GardenReading');
const sensorAuth = require('../middleware/sensorAuth');
const { limiter } = require('../middleware/rateLimiter');

router.post('/data', limiter, sensorAuth, async (req, res) => {
  try {
    const { gardenId, ph, temperature, humidity, soilMoisture, lightIntensity, co2, pressure, batteryLevel, sensorId, location, notes } = req.body;

    const reading = new GardenReading({
      gardenId,
      ph,
      temperature,
      humidity,
      soilMoisture,
      lightIntensity,
      co2,
      pressure,
      batteryLevel,
      sensorId,
      location,
      notes
    });

    await reading.save();

    res.status(201).json({
      success: true,
      data: reading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;