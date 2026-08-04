const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'osint route' });
});

module.exports = router;
