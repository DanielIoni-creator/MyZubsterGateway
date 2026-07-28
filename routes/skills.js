const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');

/**
 * @openapi
 * /api/skills:
 *   post:
 *     summary: Create a new skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               zone:
 *                 type: string
 *               user:
 *                 type: string
 *     responses:
 *       201:
 *         description: Skill created
 *       400:
 *         description: Invalid input
 */
// CREATE
router.post('/', async (req, res) => {
  try {
    const skill = new Skill(req.body);
    await skill.save();
    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @openapi
 * /api/skills:
 *   get:
 *     summary: List skills
 *     tags: [Skills]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of skills
 */
// READ ALL
router.get('/', async (req, res) => {
  try {
    const { category, zone, limit = 20, page = 1 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (zone) query.zone = { $regex: zone, $options: 'i' };

    const skills = await Skill.find(query)
      .populate('user', 'username firstName lastName averageRating')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Skill.countDocuments(query);
    res.json({
      success: true,
      data: skills,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id).populate('user', 'username firstName lastName phone location averageRating');
    if (!skill) return res.status(404).json({ success: false, error: 'Abilità non trovata' });
    res.json({ success: true, data: skill });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!skill) return res.status(404).json({ success: false, error: 'Abilità non trovata' });
    res.json({ success: true, data: skill });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!skill) return res.status(404).json({ success: false, error: 'Abilità non trovata' });
    res.json({ success: true, message: 'Abilità disattivata con successo' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET BY USER
router.get('/user/:userId', async (req, res) => {
  try {
    const skills = await Skill.find({ user: req.params.userId, isActive: true }).populate('user', 'username firstName lastName');
    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;