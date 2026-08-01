/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction history
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: List all transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions list
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'transactions endpoint' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'transactions created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transactions by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
