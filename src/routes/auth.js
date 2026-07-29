const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ success: true, message: 'Login endpoint' });
});

router.post('/register', (req, res) => {
  res.json({ success: true, message: 'Register endpoint' });
});

module.exports = router;
