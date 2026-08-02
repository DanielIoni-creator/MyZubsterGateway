const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');

// ============================================================
// REGISTRAZIONE ROBOT
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const robot = new Robot(req.body);
    await robot.save();
    res.json({ success: true, robot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// RICARICA ROBOT (x402 - ITALIANO) CON FEE E REFERRAL
// ============================================================
router.get('/ricarica', async (req, res) => {
  try {
    const { robotId, amount } = req.query;
    const robot = await Robot.findOne({ id: robotId });
    if (!robot) {
      return res.status(404).json({ error: 'Robot not found' });
    }

    const fee = parseFloat(amount) * 0.02;
    const boscoFee = parseFloat(amount) * 0.08;
    const total = parseFloat(amount) + fee + boscoFee;

    const transaction = new Transaction({
      robotId: robotId,
      type: 'recharge',
      amount: total,
      fee: fee,
      boscoFee: boscoFee,
      status: 'pending'
    });

    let referralFee = 0;
    if (robot.referrer) {
      referralFee = parseFloat(amount) * 0.05;
      transaction.referralFee = referralFee;
      transaction.referrer = robot.referrer;

      const referral = await Referral.findOne({ robotId: robotId });
      if (referral && referral.isActive) {
        referral.feeCollected += referralFee;
        referral.totalTransactions += 1;
        await referral.save();
      }
    }

    await transaction.save();

    res.status(402).json({
      status: 'payment_required',
      amount: total,
      fee: fee,
      boscoFee: boscoFee,
      referralFee: referralFee,
      address: robot.walletAddress,
      memo: `Ricarica robot ${robotId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// RICARICA ROBOT (x402 - STANDARD INTERNAZIONALE)
// ============================================================
router.get('/charge', async (req, res) => {
  try {
    const { robotId, amount } = req.query;
    const robot = await Robot.findOne({ id: robotId });
    if (!robot) {
      return res.status(404).json({ error: 'Robot not found' });
    }

    const fee = parseFloat(amount) * 0.02;
    const boscoFee = parseFloat(amount) * 0.08;
    const total = parseFloat(amount) + fee + boscoFee;

    const transaction = new Transaction({
      robotId: robotId,
      type: 'recharge',
      amount: total,
      fee: fee,
      boscoFee: boscoFee,
      status: 'pending'
    });

    let referralFee = 0;
    if (robot.referrer) {
      referralFee = parseFloat(amount) * 0.05;
      transaction.referralFee = referralFee;
      transaction.referrer = robot.referrer;

      const referral = await Referral.findOne({ robotId: robotId });
      if (referral && referral.isActive) {
        referral.feeCollected += referralFee;
        referral.totalTransactions += 1;
        await referral.save();
      }
    }

    await transaction.save();

    res.status(402).json({
      status: 'payment_required',
      amount: total,
      fee: fee,
      boscoFee: boscoFee,
      referralFee: referralFee,
      address: robot.walletAddress,
      memo: `Recharge for robot ${robotId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// OTTIENI INFO ROBOT
// ============================================================
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

// ============================================================
// AGGIORNA POSIZIONE
// ============================================================
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

// ============================================================
// CLONA ROBOT (REFERRAL)
// ============================================================
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
      referrer: original.owner,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    await referral.save();

    res.json({
      success: true,
      robot: newRobot,
      referral: {
        referrer: original.owner,
        expiresAt: referral.expiresAt,
        feeCollected: 0,
        message: '5% fee for 1 year on every recharge!'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LISTA ROBOT ATTIVI
// ============================================================
router.get('/', async (req, res) => {
  try {
    const robots = await Robot.find({ isActive: true });
    res.json(robots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
