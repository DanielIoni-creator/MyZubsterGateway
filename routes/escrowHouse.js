const express = require('express');
const router = express.Router();
const escrow = require('../escrow_immobiliare.js');

router.post('/create', (req, res) => {
  try { const { id, buyer, seller, amountMYZ, propertyId, arbitrator } = req.body; res.json({ success: true, data: escrow.createEscrow(id, buyer, seller, amountMYZ, propertyId, arbitrator) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/lock', (req, res) => {
  try { const { id, caller } = req.body; res.json({ success: true, data: escrow.lockFunds(id, caller) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/proof', (req, res) => {
  try { const { id, caller, proof } = req.body; res.json({ success: true, data: escrow.submitProof(id, caller, proof) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/release', (req, res) => {
  try { const { id, caller } = req.body; res.json({ success: true, data: escrow.release(id, caller) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/refund', (req, res) => {
  try { const { id, caller } = req.body; res.json({ success: true, data: escrow.refund(id, caller) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id', (req, res) => {
  try { res.json({ success: true, data: escrow.getEscrow(req.params.id) }); }
  catch (err) { res.status(404).json({ error: err.message }); }
});

module.exports = router;
