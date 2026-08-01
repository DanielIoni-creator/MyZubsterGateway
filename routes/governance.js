/**
 * @swagger
 * tags:
 *   name: Governance
 *   description: Governance & voting
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/governance:
 *   get:
 *     summary: List all governance
 *     tags: [Governance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Governance list
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'governance endpoint' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/governance:
 *   post:
 *     summary: Create a new governance
 *     tags: [Governance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'governance created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/governance/{id}:
 *   get:
 *     summary: Get governance by ID
 *     tags: [Governance]
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
 *         description: Governance details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
