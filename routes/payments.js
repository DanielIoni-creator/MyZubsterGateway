const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'payments route' });
});

module.exports = router;
