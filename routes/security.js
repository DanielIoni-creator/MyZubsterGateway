// routes/security.js - Security monitoring
const express = require('express');
const router = express.Router();
const os = require('os');

router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: os.loadavg(),
    timestamp: new Date().toISOString()
  });
});

router.get('/metrics', (req, res) => {
  res.json({
    rateLimit: {
      window: '15m',
      maxRequests: 100
    },
    securityHeaders: {
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
      xssProtection: '1; mode=block',
      hsts: 'max-age=31536000',
      referrerPolicy: 'strict-origin-when-cross-origin'
    },
    cors: {
      origins: ['https://myzubster.com', 'https://www.myzubster.com']
    }
  });
});

module.exports = router;
