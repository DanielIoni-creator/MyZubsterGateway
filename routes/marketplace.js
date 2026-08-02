const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Escrow = require('../models/Escrow');

// 1. Crea un lavoro
router.post('/jobs/create', async (req, res) => {
  try {
    const { clientAddress, description, amount, location, robotType } = req.body;

    const availableRobot = await Robot.findOne({
      isActive: true,
      type: robotType || 'lawn_mower',
      batteryLevel: { $gte: 20 }
    });

    if (!availableRobot) {
      return res.status(404).json({ error: 'No robot available' });
    }

    const fee = amount * 0.02;
    const boscoFee = amount * 0.08;
    const total = amount + fee + boscoFee;

    const escrow = new Escrow({
      id: `job_${Date.now()}`,
      robotId: availableRobot.id,
      clientAddress,
      amount: total,
      jobDescription: description,
      status: 'pending'
    });
    await escrow.save();

    res.json({
      success: true,
      job: {
        id: escrow.id,
        robot: availableRobot.id,
        robotName: availableRobot.name,
        amount: total,
        description,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Lista lavori disponibili
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Escrow.find({ status: 'pending' });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Ottieni dettaglio lavoro
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const job = await Escrow.findOne({ id: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Lista robot disponibili
router.get('/robots', async (req, res) => {
  try {
    const robots = await Robot.find({ isActive: true, batteryLevel: { $gte: 20 } });
    res.json(robots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
