/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Token management
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Token = require('../models/Token');

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     summary: List all tokens
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Token list
 */
router.get('/', async (req, res) => {
  try {
    const tokens = await Token.find().lean();
    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/tokens:
 *   post:
 *     summary: Create a new token
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - symbol
 *             properties:
 *               name:
 *                 type: string
 *               symbol:
 *                 type: string
 *               totalSupply:
 *                 type: number
 *     responses:
 *       201:
 *         description: Token created
 */
router.post('/', auth, async (req, res) => {
  try {
    const token = await Token.create({ ...req.body, creator: req.user._id });
    res.status(201).json({ success: true, data: token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/tokens/{id}:
 *   get:
 *     summary: Get token details
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token data
 */
router.get('/:id', async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ success: false, error: 'Token not found' });
    res.json({ success: true, data: token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
