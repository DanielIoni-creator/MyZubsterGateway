const express = require('express');
const router = express.Router();
const bookingService = require('../../services/booking.service');
const auth = require('../../middleware/auth');

// GET /api/v1/bookings/history/:userId
router.get('/history/:userId', auth.verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, category } = req.query;

    const result = await bookingService.getHistory(userId, { page, limit, status, category });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/bookings
router.post('/', auth.verifyToken, async (req, res) => {
  try {
    const booking = await bookingService.create(req.body, req.user.id);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/bookings/:id/status
router.put('/:id/status', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await bookingService.updateStatus(id, status, req.user.id);
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/bookings/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
  try {
    const booking = await bookingService.getById(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

module.exports = router;