/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Offer management
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Offer = require('../models/Offer');

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: List all offers
 *     tags: [Offers]
 *     responses:
 *       200:
 *         description: Offer list
 */
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Create a new offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Offer created
 */
router.post('/', auth, async (req, res) => {
  try {
    const offer = await Offer.create({ ...req.body, creator: req.user._id });
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
