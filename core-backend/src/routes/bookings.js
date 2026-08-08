const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

// GET /api/bookings - Test route
router.get('/', (req, res) => {
  res.json({ 
    message: '✅ Bookings route is working!',
    routes: ['GET /', 'GET /:id', 'POST /', 'GET /history/:userId']
  });
});

// GET /api/bookings/history/:userId
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    console.log('📊 History chiamato per userId:', userId);

    // Verifica se userId è un ObjectId valido
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    
    if (!isValidObjectId) {
      // Se non è un ID valido, restituisci array vuoto
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    }

    // Filtro per userId (come client o professional)
    const filter = {
      $or: [
        { clientId: userId },
        { professionalId: userId }
      ]
    };

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query con populate
    const bookings = await Booking.find(filter)
      .populate('clientId', 'name email avatar')
      .populate('professionalId', 'name email avatar')
      .populate('skillId', 'title category description')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    // Formatta la risposta
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      skillId: booking.skillId?._id || null,
      skillTitle: booking.skillId?.title || null,
      skillCategory: booking.skillId?.category || null,
      clientId: booking.clientId?._id || null,
      clientName: booking.clientId?.name || null,
      clientAvatar: booking.clientId?.avatar || null,
      professionalId: booking.professionalId?._id || null,
      professionalName: booking.professionalId?.name || null,
      professionalAvatar: booking.professionalId?.avatar || null,
      date: booking.date,
      timeSlot: booking.timeSlot,
      amount: booking.amount,
      status: booking.status,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt
    }));

    res.json({
      success: true,
      data: formattedBookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Errore history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

module.exports = router;