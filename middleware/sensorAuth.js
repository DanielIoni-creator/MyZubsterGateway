const SensorApiKey = process.env.SENSOR_API_KEY || process.env.API_KEY;

module.exports = (req, res, next) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  if (apiKey !== SensorApiKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};