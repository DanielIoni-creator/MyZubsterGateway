const express = require('express');
const router = express.Router();
const offers = [];
const exchanges = [];

router.post('/offer', (req, res) => {
  const { userId, plantType, plantName, description } = req.body;
  if (!userId || !plantType || !plantName) return res.status(400).json({error: 'Missing fields'});
  const offer = { id: offers.length+1, userId, plantType, plantName, description: description||'', status: 'active', createdAt: new Date().toISOString() };
  offers.push(offer);
  res.status(201).json(offer);
});

router.get('/offers', (req, res) => {
  let f = offers.filter(o => o.status === 'active');
  if (req.query.type) f = f.filter(o => o.plantType === req.query.type);
  res.json({offers: f, total: f.length});
});

router.post('/accept/:id', (req, res) => {
  const offer = offers.find(o => o.id === parseInt(req.params.id) && o.status === 'active');
  if (!offer) return res.status(404).json({error: 'Not found'});
  offer.status = 'accepted';
  const ex = { id: exchanges.length+1, offerId: offer.id, from: offer.userId, to: req.body.userId, completed: false };
  exchanges.push(ex);
  res.json(ex);
});

router.put('/complete/:id', (req, res) => {
  const ex = exchanges.find(e => e.id === parseInt(req.params.id));
  if (!ex) return res.status(404).json({error: 'Not found'});
  ex.completed = true; ex.completedAt = new Date().toISOString();
  res.json(ex);
});

router.get('/history/:userId', (req, res) => {
  const userExchanges = exchanges.filter(e => e.from === req.params.userId || e.to === req.params.userId);
  res.json({exchanges: userExchanges, total: userExchanges.length});
});

module.exports = router;
