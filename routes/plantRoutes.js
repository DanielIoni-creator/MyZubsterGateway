const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/register', (req, res) => {
  res.json({ success: true, message: 'Pianta registrata' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id } });
});

module.exports = router;
