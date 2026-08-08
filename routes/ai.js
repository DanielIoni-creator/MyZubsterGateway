const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'ai route' });
});

module.exports = router;
