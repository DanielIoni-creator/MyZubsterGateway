const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: { stats: {} } });
});

module.exports = router;
