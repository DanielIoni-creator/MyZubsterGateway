const express = require('express');
const router = express.Router();
const MoneroService = require('../services/monero');

const moneroService = new MoneroService({});
moneroService.connect().catch(console.error);

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a new payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 address:
 *                   type: string
 *                 amount:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/create-order', async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'orderId and amount are required' 
      });
    }

    const result = await moneroService.createPaymentOrder(orderId, amount, description);
    res.json(result);
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payments/status/{orderId}:
 *   get:
 *     summary: Check payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [pending, completed, failed]
 *       500:
 *         description: Server error
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await moneroService.verifyPayment(orderId);
    res.json(result);
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payments/check-balance:
 *   post:
 *     summary: Check balance of a Monero address
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 balance:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/check-balance', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, message: 'address is required' });
    }

    const result = await moneroService.checkBalance(address);
    res.json(result);
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
