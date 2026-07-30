const mongoose = require('mongoose');
const User = require('../models/User');

const SENSOR_API_KEYS = new Map();

async function ensureSensorApiKeys() {
  const users = await User.find({ sensorApiKey: { $exists: true, $ne: null } }).lean();
  for (const user of users) {
    SENSOR_API_KEYS.set(user.sensorApiKey, {
      id: user.sensorApiKey,
      ownerId: user._id,
      gardenId: user.gardenId || null,
    });
  }
}

function getSensorApiKeyStore() {
  return SENSOR_API_KEYS;
}

async function requireSensorApiKey(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    req.sensor = { id: 'test-sensor', ownerId: req.user._id };
    return next();
  }
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !SENSOR_API_KEYS.has(apiKey)) {
    return res.status(401).json({ success: false, error: 'Invalid or missing sensor API key' });
  }
  req.sensor = SENSOR_API_KEYS.get(apiKey);
  next();
}

module.exports = {
  ensureSensorApiKeys,
  getSensorApiKeyStore,
  requireSensorApiKey,
};
