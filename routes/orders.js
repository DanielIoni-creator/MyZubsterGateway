const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'orders route' });
});

module.exports = router;
