/**
 * @swagger
 * tags:
 *   name: Requests
 *   description: Request management
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: List all requests
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Requests list
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'requests endpoint' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Create a new requests
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'requests created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Get requests by ID
 *     tags: [Requests]
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
 *         description: Requests details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
