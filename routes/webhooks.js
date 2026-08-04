const express = require('express');
const router = express.Router();
const Webhook = require('../models/Webhook');

router.post('/register', async (req, res) => {
  const { url, events } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  
  try {
    const hook = new Webhook({ url, events: events || ['*'] });
    await hook.save();
    res.json({ success: true, id: hook._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Webhook.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
