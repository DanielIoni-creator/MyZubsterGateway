const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'escrow route' });
});

module.exports = router;
