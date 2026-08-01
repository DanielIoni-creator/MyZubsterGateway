/**
 * @swagger
 * tags:
 *   name: Skills
 *   description: Skills management
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/skills:
 *   get:
 *     summary: List all skills
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Skills list
 */
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'skills endpoint' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/skills:
 *   post:
 *     summary: Create a new skills
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', auth, async (req, res) => {
  try {
    res.status(201).json({ success: true, data: req.body, message: 'skills created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/skills/{id}:
 *   get:
 *     summary: Get skills by ID
 *     tags: [Skills]
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
 *         description: Skills details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
