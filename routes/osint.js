/**
 * @swagger
 * tags:
 *   name: OSINT
 *   description: OSINT search tools
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/osint:
 *   get:
 *     summary: List all osint
 *     tags: [OSINT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OSINT list
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'osint endpoint' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/osint:
 *   post:
 *     summary: Create a new osint
 *     tags: [OSINT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'osint created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/osint/{id}:
 *   get:
 *     summary: Get osint by ID
 *     tags: [OSINT]
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
 *         description: OSINT details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
