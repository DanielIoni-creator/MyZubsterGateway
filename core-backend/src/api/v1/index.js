const express = require('express');
const router = express.Router();

// Solo bookings per ora
const bookingRoutes = require('./bookings');

// Mount routes
router.use('/bookings', bookingRoutes);

// Health check per API v1
router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() });
});

// Root route per API v1
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MyZubster API v1',
    endpoints: ['/bookings', '/bookings/history/:userId', '/health']
  });
});

module.exports = router;