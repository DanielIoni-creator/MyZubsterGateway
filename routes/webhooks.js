const express = require('express');
const router = express.Router();

router.post('/verify', (req, res) => {
  res.json({ success: true, message: 'Webhook ricevuto' });
});

module.exports = router;
