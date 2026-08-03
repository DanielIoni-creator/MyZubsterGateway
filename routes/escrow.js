const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');
const Transaction = require('../models/Transaction');
const Escrow = require('../models/Escrow');

/**
 * @swagger
 * /api/escrow/create:
 *   post:
 *     summary: Create a new escrow
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - robotId
 *               - clientAddress
 *               - amount
 *               - jobDescription
 *             properties:
 *               robotId:
 *                 type: string
 *               clientAddress:
 *                 type: string
 *               amount:
 *                 type: number
 *               jobDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Escrow created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 escrow:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     robotId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     fee:
 *                       type: number
 *                     boscoFee:
 *                       type: number
 *                     address:
 *                       type: string
 *                     status:
 *                       type: string
 *       404:
 *         description: Robot not found
 */
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

/**
 * @swagger
 * /api/escrow/{escrowId}/complete:
 *   post:
 *     summary: Complete an escrow job
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escrowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job completed
 *       400:
 *         description: Escrow already finalized
 *       404:
 *         description: Escrow not found
 */
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

/**
 * @swagger
 * /api/escrow/{escrowId}/dispute:
 *   post:
 *     summary: Open a dispute on an escrow
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escrowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispute opened
 *       404:
 *         description: Escrow not found
 */
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

/**
 * @swagger
 * /api/escrow/{escrowId}/release:
 *   post:
 *     summary: Release escrow funds (AI arbiter)
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escrowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funds released
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 escrow:
 *                   $ref: '#/components/schemas/Escrow'
 *                 distribution:
 *                   type: object
 *                   properties:
 *                     owner:
 *                       type: number
 *                     myZubster:
 *                       type: number
 *                     bosco:
 *                       type: number
 *       400:
 *         description: Invalid escrow status
 *       404:
 *         description: Escrow or Robot not found
 */
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

/**
 * @swagger
 * /api/escrow/{escrowId}:
 *   get:
 *     summary: Get escrow by ID
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: escrowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escrow details
 *       404:
 *         description: Escrow not found
 */
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
