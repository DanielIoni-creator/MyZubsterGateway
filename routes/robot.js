const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Referral = require('../models/Referral');

// Registra un robot
router.post('/register', async (req, res) => {
  try {
    const robot = new Robot(req.body);
    await robot.save();
    res.json({ success: true, robot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ricarica robot (x402)
router.get('/ricarica', async (req, res) => {
  try {
    const { robotId, amount } = req.query;
    const robot = await Robot.findOne({ id: robotId });
    if (!robot) {
      return res.status(404).json({ error: 'Robot not found' });
    }
    const fee = amount * 0.02;
    const boscoFee = amount * 0.08;
    res.status(402).json({
      status: 'payment_required',
      amount: parseFloat(amount) + fee + boscoFee,
      fee: fee,
      boscoFee: boscoFee,
      address: robot.walletAddress,
      memo: `Ricarica robot ${robotId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ottieni robot
router.get('/:robotId', async (req, res) => {
  try {
    const robot = await Robot.findOne({ id: req.params.robotId });
    if (!robot) {
      return res.status(404).json({ error: 'Robot not found' });
    }
    res.json(robot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aggiorna posizione
router.post('/:robotId/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const robot = await Robot.findOneAndUpdate(
      { id: req.params.robotId },
      { location: { lat, lng }, lastSeen: new Date() },
      { new: true }
    );
    res.json(robot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clona robot
router.post('/clone', async (req, res) => {
  try {
    const { originalId, newId, name, owner } = req.body;
    const original = await Robot.findOne({ id: originalId });
    if (!original) {
      return res.status(404).json({ error: 'Original robot not found' });
    }
    const newRobot = new Robot({
      id: newId,
      owner,
      name,
      type: original.type,
      skills: original.skills,
      walletAddress: `4A2B${Math.random().toString(36).substring(2, 10)}${newId.substring(0, 6)}`,
      referrer: original.owner
    });
    await newRobot.save();
    const referral = new Referral({
      robotId: newId,
      referrer: original.owner
    });
    await referral.save();
    res.json({ success: true, robot: newRobot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
