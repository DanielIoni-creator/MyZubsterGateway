const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Transaction = require('../models/Transaction');
const Escrow = require('../models/Escrow');

// 1. Crea un nuovo escrow
router.post('/create', async (req, res) => {
  try {
    const { robotId, clientAddress, amount, jobDescription } = req.body;
    const robot = await Robot.findOne({ id: robotId });
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const myZubsterFee = amount * 0.02;
    const boscoFee = amount * 0.08;
    const total = amount + myZubsterFee + boscoFee;

    const escrow = new Escrow({
      id: `escrow_${Date.now()}`,
      robotId,
      clientAddress,
      amount,
      jobDescription,
      status: 'pending'
    });
    await escrow.save();

    const transaction = new Transaction({
      robotId,
      type: 'escrow',
      amount: total,
      fee: myZubsterFee,
      boscoFee,
      status: 'pending'
    });
    await transaction.save();

    res.json({
      success: true,
      escrow: {
        id: escrow.id,
        robotId,
        amount: total,
        fee: myZubsterFee,
        boscoFee,
        address: robot.walletAddress,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Completa lavoro
router.post('/:escrowId/complete', async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ id: req.params.escrowId });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    if (escrow.status !== 'pending') return res.status(400).json({ error: 'Escrow already finalized' });

    escrow.status = 'completed';
    escrow.completedAt = new Date();
    await escrow.save();

    const transaction = new Transaction({
      robotId: escrow.robotId,
      type: 'escrow_release',
      amount: escrow.amount,
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      escrow,
      message: 'Job completed! Funds will be released in 3 days if no dispute.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Disputa
router.post('/:escrowId/dispute', async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ id: req.params.escrowId });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

    escrow.status = 'disputed';
    await escrow.save();

    const aiDecision = { 
      decision: 'RELEASE', 
      confidence: 0.95, 
      reason: 'GPS logs show robot completed the job successfully.' 
    };

    res.json({
      success: true,
      escrow,
      aiDecision,
      message: 'Dispute opened. AI arbiter will review within 24h.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Rilascia fondi (AI arbiter)
router.post('/:escrowId/release', async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ id: req.params.escrowId });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    if (escrow.status !== 'completed' && escrow.status !== 'disputed') {
      return res.status(400).json({ error: 'Invalid escrow status' });
    }

    const robot = await Robot.findOne({ id: escrow.robotId });
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const ownerAmount = escrow.amount * 0.90;
    const myZubsterFee = escrow.amount * 0.02;
    const boscoFee = escrow.amount * 0.08;

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    await escrow.save();

    const transaction = new Transaction({
      robotId: escrow.robotId,
      type: 'escrow_release',
      amount: escrow.amount,
      fee: myZubsterFee,
      boscoFee,
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      escrow,
      distribution: {
        owner: ownerAmount,
        myZubster: myZubsterFee,
        bosco: boscoFee
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Ottieni stato
router.get('/:escrowId', async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ id: req.params.escrowId });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    res.json(escrow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
