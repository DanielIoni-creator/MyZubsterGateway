const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'scanner route' });
});

module.exports = router;
