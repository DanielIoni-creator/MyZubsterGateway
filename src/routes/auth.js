const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ success: true, message: req.t('auth.loginEndpoint') });
});

router.post('/register', (req, res) => {
  res.json({ success: true, message: req.t('auth.registerEndpoint') });
});

module.exports = router;
